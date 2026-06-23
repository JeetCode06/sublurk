import type { MapNode, MapState } from '../../shared/game';

// A campaign needs a few stops but not an endless trek; these bounds keep an
// AI-authored journey to a readable length.
const MIN_NODES = 2;
const MAX_NODES = 8;

// A safe generic journey used when a map can't be generated, so a campaign
// always has a path and a destination. Its final boss matches the default world.
export const DEFAULT_MAP: MapState = {
  nodes: [
    {
      id: 'node-1',
      name: 'The Threshold',
      themeTag: 'a crumbling entrance hall of cold stone',
      cleared: false,
    },
    {
      id: 'node-2',
      name: 'The Deep Halls',
      themeTag: 'twisting underground passages lit by guttering torches',
      cleared: false,
    },
    {
      id: 'node-3',
      name: 'The Sunken Vault',
      themeTag: 'a flooded vault of forgotten relics',
      cleared: false,
    },
    {
      id: 'node-4',
      name: 'The Hollow Throne',
      themeTag: 'a vast throne room of fused bone',
      cleared: false,
    },
  ],
  currentNodeIndex: 0,
  finalBoss: { name: 'the Hollow King', defeated: false },
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function cleanString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function coerceVillain(
  value: unknown
): { name: string; concept: string } | undefined {
  const source = asRecord(value);
  const name = cleanString(source.name, '');
  const concept = cleanString(source.concept, '');
  if (name.length === 0 || concept.length === 0) return undefined;
  return { name, concept };
}

function coerceNode(value: unknown, index: number): MapNode | null {
  const source = asRecord(value);
  const name = cleanString(source.name, '');
  const themeTag = cleanString(source.themeTag, '');
  if (name.length === 0 || themeTag.length === 0) return null;
  const node: MapNode = {
    id: cleanString(source.id, `node-${index + 1}`),
    name,
    themeTag,
    cleared: asBoolean(source.cleared),
  };
  const villain = coerceVillain(source.villain);
  if (villain) node.villain = villain;
  return node;
}

function coerceNodes(value: unknown): MapNode[] {
  if (!Array.isArray(value)) return [];
  const out: MapNode[] = [];
  for (const item of value) {
    const node = coerceNode(item, out.length);
    if (node !== null) out.push(node);
    if (out.length >= MAX_NODES) break;
  }
  return out;
}

function coerceBoss(value: unknown): MapState['finalBoss'] {
  const source = asRecord(value);
  return {
    name: cleanString(source.name, DEFAULT_MAP.finalBoss.name),
    defeated: asBoolean(source.defeated),
  };
}

// Forces parsed-but-untrusted map data into a sane MapState, preserving run
// progress (cleared flags, current position, boss state). Too few usable nodes
// falls back to the default journey. Used both for AI output and for repairing
// an older or partial record read from storage.
export function coerceMap(raw: unknown): MapState {
  const source = asRecord(raw);
  const nodes = coerceNodes(source.nodes);
  if (nodes.length < MIN_NODES) return DEFAULT_MAP;

  const rawIndex =
    typeof source.currentNodeIndex === 'number' &&
    Number.isFinite(source.currentNodeIndex)
      ? Math.floor(source.currentNodeIndex)
      : 0;
  const currentNodeIndex = Math.max(0, Math.min(nodes.length - 1, rawIndex));

  return { nodes, currentNodeIndex, finalBoss: coerceBoss(source.finalBoss) };
}

// Returns a fresh copy of a map for a new run: nothing cleared, party at the
// start, boss undefeated. Node objects are copied so runs never share state.
export function freshMap(template: MapState): MapState {
  return {
    nodes: template.nodes.map((node) => ({ ...node, cleared: false })),
    currentNodeIndex: 0,
    finalBoss: { name: template.finalBoss.name, defeated: false },
  };
}

// How many rooms the party clears within a location before moving to the next.
const ROOMS_PER_NODE = 3;

// Advances the party along the map as rooms are cleared. The journey is linear:
// every ROOMS_PER_NODE rooms completes one location. Locations the party has
// passed are marked cleared; the party holds at the final location (until the
// boss is faced there). Pure and derived only from depth, so it can't drift out
// of step with the run.
export function advanceMapForDepth(map: MapState, depth: number): MapState {
  const reached = Math.min(
    Math.floor(depth / ROOMS_PER_NODE),
    map.nodes.length - 1
  );
  return {
    ...map,
    currentNodeIndex: reached,
    nodes: map.nodes.map((node, i) => ({ ...node, cleared: i < reached })),
  };
}

// True once the party stands at the final location — the boss's domain. The
// room there is the final boss, so resolving it wins the run.
export function atFinalBoss(map: MapState): boolean {
  return map.currentNodeIndex >= map.nodes.length - 1;
}

// Marks the campaign won: the boss is down and the whole journey is complete.
export function markBossDefeated(map: MapState): MapState {
  return {
    ...map,
    finalBoss: { ...map.finalBoss, defeated: true },
    nodes: map.nodes.map((node) => ({ ...node, cleared: true })),
  };
}