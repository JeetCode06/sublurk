import type { GameState } from '../../shared/game';

export function serializeGame(state: GameState): string {
  return JSON.stringify(state);
}

// Returns null on corrupt or schema-mismatched data instead of throwing,
// so a bad value in Redis is treated as "no game" rather than crashing a turn.
export function deserializeGame(raw: string): GameState | null {
  try {
    const value = JSON.parse(raw) as Partial<GameState>;
    if (
      typeof value.postId === 'string' &&
      value.party != null &&
      value.room != null
    ) {
      return value as GameState;
    }
    return null;
  } catch {
    return null;
  }
}