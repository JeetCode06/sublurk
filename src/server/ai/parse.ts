import type {
  EntityKind,
  MapState,
  Outcome,
  ResolveResult,
  Scene,
  SceneEntity,
  WorldBible,
} from '../../shared/game';
import { coerceWorldBible } from '../game/bible';
import { coerceMap } from '../game/map';

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function asOutcome(value: unknown): Outcome {
  if (value === 'success' || value === 'partial' || value === 'fail') {
    return value;
  }
  return 'partial';
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

// Offered whenever no scene- or turn-specific suggestions are available, so the
// player is never left without a next move to reach for. Kept generic and
// in-voice, reading as the dungeon's own quiet prompting.
const DEFAULT_SUGGESTIONS = ['Look closer', 'Press deeper', 'Steel yourself'];

// A neutral result used when the model reply can't be parsed: the turn fizzles
// without harming or advancing the party, so they can simply try again. It still
// carries default suggestions so the action chips never vanish mid-run.
const FALLBACK_RESULT: ResolveResult = {
  narration:
    'For a heartbeat the dungeon goes still, and whatever you tried slips away unspent. Something down here is waiting. Try again.',
  outcome: 'partial',
  hpDelta: 0,
  goldDelta: 0,
  inventoryAdd: [],
  inventoryRemove: [],
  statusAdd: [],
  statusRemove: [],
  roomResolved: false,
  nextRoomHint: null,
  death: false,
  suggestions: [...DEFAULT_SUGGESTIONS],
};

// Pulls the first {...} block out of the reply, tolerating markdown fences or
// stray prose the model may wrap around the JSON.
function extractJson(raw: string): string | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  return raw.slice(start, end + 1);
}

export function parseResolveResult(raw: string): ResolveResult {
  const json = extractJson(raw);
  if (json === null) return FALLBACK_RESULT;

  let value: Record<string, unknown>;
  try {
    value = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return FALLBACK_RESULT;
  }

  return {
    narration: asString(value.narration, FALLBACK_RESULT.narration),
    outcome: asOutcome(value.outcome),
    hpDelta: asNumber(value.hpDelta, 0),
    goldDelta: asNumber(value.goldDelta, 0),
    inventoryAdd: asStringArray(value.inventoryAdd),
    inventoryRemove: asStringArray(value.inventoryRemove),
    statusAdd: asStringArray(value.statusAdd),
    statusRemove: asStringArray(value.statusRemove),
    roomResolved: asBoolean(value.roomResolved, false),
    nextRoomHint: asNullableString(value.nextRoomHint),
    death: asBoolean(value.death, false),
    suggestions: suggestionsOrDefault(value.suggestions),
  };
}

// Caps and bounds for AI-authored scene contents: a board only needs a few
// entities and dangers, and a foe's stats must stay in playable ranges.
const MAX_ENTITIES = 4;
const MAX_THREATS = 3;
const MAX_SUGGESTIONS = 3;
const MIN_FOE_THREAT = 1;
const MAX_FOE_THREAT = 5;
const MIN_FOE_HP = 1;
const MAX_FOE_HP = 40;

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

// A foe the model left without hp still needs a pool for the combat loop; scale
// a sensible default off its threat so a nastier-looking foe takes more to fell.
function defaultFoeHp(threat: number): number {
  return clampInt(6 + threat * 4, MIN_FOE_HP, MAX_FOE_HP);
}

function asEntityKind(value: unknown): EntityKind | null {
  return value === 'foe' || value === 'npc' || value === 'object'
    ? value
    : null;
}

// Coerces one untrusted entry into a valid SceneEntity, or null if it lacks a
// usable kind and name. Threat and hp are kept only for foes and clamped to
// playable ranges; the AI can't push a foe to 9999 hp.
function asEntity(value: unknown): SceneEntity | null {
  if (typeof value !== 'object' || value === null) return null;
  const source = value as Record<string, unknown>;
  const kind = asEntityKind(source.kind);
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  if (kind === null || name.length === 0) return null;

  const entity: SceneEntity = {
    kind,
    name,
    blurb: typeof source.blurb === 'string' ? source.blurb.trim() : '',
  };
  if (kind === 'foe') {
    const rawThreat = asNumber(source.threat, 0);
    const threat =
      rawThreat > 0
        ? clampInt(rawThreat, MIN_FOE_THREAT, MAX_FOE_THREAT)
        : MIN_FOE_THREAT;
    const rawHp = asNumber(source.hp, 0);
    const hp =
      rawHp > 0
        ? clampInt(rawHp, MIN_FOE_HP, MAX_FOE_HP)
        : defaultFoeHp(threat);
    entity.threat = threat;
    entity.hp = hp;
    entity.maxHp = hp;
  }
  return entity;
}

function asEntities(value: unknown): SceneEntity[] {
  if (!Array.isArray(value)) return [];
  const out: SceneEntity[] = [];
  for (const item of value) {
    const entity = asEntity(item);
    if (entity !== null) out.push(entity);
    if (out.length >= MAX_ENTITIES) break;
  }
  return out;
}

function asThreats(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_THREATS) break;
  }
  return out;
}

// Trims, de-duplicates, and caps the AI's suggested actions so the player is
// offered a short, clean list.
function asSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

// The parsed suggestions when the model offered any, else the shared defaults —
// the action chips must never be empty, whether the reply was thin or unparsed.
function suggestionsOrDefault(value: unknown): string[] {
  const parsed = asSuggestions(value);
  return parsed.length > 0 ? parsed : [...DEFAULT_SUGGESTIONS];
}

// Used when a scene can't be generated, so a room is never left blank. Written
// in the Warden's watchful voice and carrying default suggestions, so a failed
// scene reads as an intentional beat rather than a blank, chip-less board.
const FALLBACK_DESCRIPTION =
  'The chamber holds its shape in the dark, watchful and unhurried, as if it has been waiting for you. Somewhere ahead, the way continues down.';

export const FALLBACK_SCENE: Scene = {
  description: FALLBACK_DESCRIPTION,
  entities: [],
  threats: [],
  suggestions: [...DEFAULT_SUGGESTIONS],
};

// The cold open used when an intro can't be generated: it still plants the
// frame — pulled in, no way back but down — so even a fallback opening sets the
// stakes rather than reading as an error.
const FALLBACK_INTRO =
  'The screen is behind you now, and it will not open again from this side. The only way back is down — past everything the dark has made to keep you. Descend.';

export function parseIntro(raw: string): string {
  const json = extractJson(raw);
  if (json === null) return FALLBACK_INTRO;
  try {
    const value = JSON.parse(json) as Record<string, unknown>;
    const intro = typeof value.intro === 'string' ? value.intro.trim() : '';
    return intro.length > 0 ? intro : FALLBACK_INTRO;
  } catch {
    return FALLBACK_INTRO;
  }
}

// Parses the structured scene reply, coercing entities and threats into safe,
// capped, well-formed data; a missing or unreadable reply becomes FALLBACK_SCENE
// so the board always has something valid — and chip-bearing — to render.
export function parseScene(raw: string): Scene {
  const json = extractJson(raw);
  if (json === null) return FALLBACK_SCENE;
  try {
    const value = JSON.parse(json) as Record<string, unknown>;
    const description =
      typeof value.description === 'string' &&
      value.description.trim().length > 0
        ? value.description.trim()
        : FALLBACK_DESCRIPTION;
    return {
      description,
      entities: asEntities(value.entities),
      threats: asThreats(value.threats),
      suggestions: suggestionsOrDefault(value.suggestions),
    };
  } catch {
    return FALLBACK_SCENE;
  }
}

// Parses the world-bible reply and runs it through coerceWorldBible, so a
// missing, wrong-typed, or unparseable field always degrades to the default
// world rather than breaking the campaign. coerceWorldBible(null) is the
// default world, so both failure paths converge on a safe result.
export function parseWorldBible(raw: string): WorldBible {
  const json = extractJson(raw);
  if (json === null) return coerceWorldBible(null);
  try {
    return coerceWorldBible(JSON.parse(json));
  } catch {
    return coerceWorldBible(null);
  }
}

// Parses the map reply and runs it through coerceMap, so a missing or malformed
// journey always degrades to the default map. coerceMap(null) is the default
// journey, so both failure paths converge on a safe, complete map.
export function parseMap(raw: string): MapState {
  const json = extractJson(raw);
  if (json === null) return coerceMap(null);
  try {
    return coerceMap(JSON.parse(json));
  } catch {
    return coerceMap(null);
  }
}