import type { GameState } from '../shared/game';

// How long a turn stays open for votes before it auto-resolves. Short so a
// first-time visitor can see the whole loop quickly in one sitting.
export const TURN_CADENCE_MS = 2 * 60 * 1000;

// Stamps the next resolution deadline onto a turn that is open for actions, so
// the scheduler knows when to resolve and the webview can show a countdown.
// A finished run carries no deadline.
export function withDeadline(
  state: GameState,
  now: number = Date.now()
): GameState {
  if (state.phase !== 'awaiting_actions') return state;
  return { ...state, nextResolveAt: now + TURN_CADENCE_MS };
}

// When the current turn opened: used to consider only comments posted during
// this turn as candidate actions, so old comments don't win every turn.
export function turnStartedAt(state: GameState): number {
  return state.nextResolveAt - TURN_CADENCE_MS;
}

// Whether the current turn's deadline has passed.
export function isDue(state: GameState, now: number = Date.now()): boolean {
  return now >= state.nextResolveAt;
}
