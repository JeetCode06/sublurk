import type { GameState } from '../../shared/game';

export type RunRecord = {
  runNumber: number;
  outcome: 'died' | 'won';
  depth: number;
  location: string;
  villain: string;
};

export type Lore = {
  runs: RunRecord[];
};

export const EMPTY_LORE: Lore = { runs: [] };

// The most recent past run is enough to taunt with; the rest provide a count.
export function recordFromState(state: GameState): RunRecord {
  const node = state.map.nodes[state.map.currentNodeIndex];
  return {
    runNumber: state.runNumber,
    outcome: state.phase === 'won' ? 'won' : 'died',
    depth: state.party.depth,
    location: node?.name ?? 'the depths',
    villain: node?.villain?.name ?? state.map.finalBoss.name,
  };
}

// The nemesis's remembered line, derived from how past runs ended. Empty when
// there is no history yet, so a first descent carries no taunt.
export function tauntFromLore(lore: Lore): string {
  const last = lore.runs.at(-1);
  if (!last) return '';
  if (last.outcome === 'won') {
    return `You conquered this dungeon once. ${last.villain} has waited for a rematch ever since.`;
  }
  const deaths = lore.runs.filter((run) => run.outcome === 'died').length;
  if (deaths >= 3) {
    return `${deaths} times this place has buried you. ${last.villain} remembers every fall — the last at ${last.location}.`;
  }
  if (deaths === 2) {
    return `Twice now you have fallen here. ${last.villain} took you last at ${last.location}, and is ready for you again.`;
  }
  return `Last time, you fell to ${last.villain} at ${last.location}. The dungeon has not forgotten.`;
}