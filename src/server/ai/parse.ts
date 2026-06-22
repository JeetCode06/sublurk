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

// A neutral result used when the AI reply can't be parsed: the turn fizzles
// without harming or advancing the party, so the community can simply try again.
const FALLBACK_RESULT: ResolveResult = {
  narration: 'The dungeon falls quiet, the moment slipping away unspent.',
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
  };
}

// Caps and bounds for AI-authored scene contents: a board only needs a few
// entities and dangers, and a foe's stats must stay in playable ranges.
const MAX_ENTITIES = 4;
const MAX_THREATS = 3;
const MIN_FOE_THREAT = 1;
const MAX_FOE_THREAT = 5;
const MIN_FOE_HP = 1;
const MAX_FOE_HP = 40;

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
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
    const threat = asNumber(source.threat, 0);
    const hp = asNumber(source.hp, 0);
    if (threat > 0)
      entity.threat = clampInt(threat, MIN_FOE_THREAT, MAX_FOE_THREAT);
    if (hp > 0) entity.hp = clampInt(hp, MIN_FOE_HP, MAX_FOE_HP);
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

// Used when a scene can't be generated, so a room is never left blank.
const FALLBACK_DESCRIPTION =
  'The chamber waits in restless shadow, its purpose not yet clear. The party steadies their torches and presses on.';

export const FALLBACK_SCENE: Scene = {
  description: FALLBACK_DESCRIPTION,
  entities: [],
  threats: [],
};

// Parses the structured scene reply, coercing the AI's entity and threat lists
// into safe, capped, well-formed data. A missing or unreadable reply falls back
// to a calm, empty scene so the board always has something valid to render.
const FALLBACK_INTRO =
  'Your party stands at the dungeon mouth, bound by a common purpose. The dark ahead is long and the goal far, but every step is yours to choose together. Begin.';

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