import type { Outcome, ResolveResult } from '../../shared/game';

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

// Used when a room intro can't be generated, so a room is never left blank.
export const FALLBACK_SCENE =
  'The chamber waits in restless shadow, its purpose not yet clear. The party steadies their torches and presses on.';

// Parses the room-intro reply ({ "scene": string }), falling back to neutral
// prose when the AI is unavailable or the reply can't be read.
export function parseRoomScene(raw: string): string {
  const json = extractJson(raw);
  if (json === null) return FALLBACK_SCENE;
  try {
    const value = JSON.parse(json) as Record<string, unknown>;
    const scene = value.scene;
    return typeof scene === 'string' && scene.trim().length > 0
      ? scene.trim()
      : FALLBACK_SCENE;
  } catch {
    return FALLBACK_SCENE;
  }
}