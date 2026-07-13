import type { GameState, HistoryEntry } from '../../shared/game';

// A run's story can grow without bound, so keep a generous but finite window.
// Long enough that a deep run replays whole, short enough to stay a small save.
export const HISTORY_LIMIT = 300;

// Appends beats to the run's story, trimming the oldest once the cap is hit.
export function appendHistory(
  state: GameState,
  entries: HistoryEntry[]
): GameState {
  if (entries.length === 0) return state;
  const history = [...(state.history ?? []), ...entries].slice(-HISTORY_LIMIT);
  return { ...state, history };
}
