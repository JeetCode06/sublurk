import type { GameState } from '../../shared/game';
import { coerceMap } from '../game/map';
import { CLASSES } from '../game/classes';
import { coerceAbilities } from '../game/abilities';

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
      const state = value as GameState;
      // Backfill scene fields added after some runs were already saved, so an
      // older record keeps working instead of being discarded. The map is run
      // through coerceMap, which fills it for older saves and repairs partials.
      return {
        ...state,
        map: coerceMap(state.map),
        party: {
          ...state.party,
          abilities: coerceAbilities(
            state.party.abilities,
            CLASSES[state.party.classId].abilities
          ),
        },
        room: {
          ...state.room,
          entities: Array.isArray(state.room.entities)
            ? state.room.entities
            : [],
          threats: Array.isArray(state.room.threats) ? state.room.threats : [],
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}