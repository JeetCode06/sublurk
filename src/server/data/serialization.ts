import type { GameState, Party } from '../../shared/game';
import { coerceMap } from '../game/map';
import { CLASSES } from '../game/classes';
import { coerceAbilities } from '../game/abilities';
import { coerceConditions } from '../game/conditions';

export function serializeGame(state: GameState): string {
  return JSON.stringify(state);
}

// Older saves stored this currency as "gold"; carry that balance across the
// rename so a run already in progress keeps its embers rather than resetting to
// zero. The stored party is treated as untrusted, since either field may be
// missing depending on when it was saved.
function coerceEmbers(party: Party): number {
  const record = party as unknown as { embers?: unknown; gold?: unknown };
  if (typeof record.embers === 'number') return record.embers;
  if (typeof record.gold === 'number') return record.gold;
  return 0;
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
        intro: typeof state.intro === 'string' ? state.intro : '',
        nemesisLine:
          typeof state.nemesisLine === 'string' ? state.nemesisLine : '',
        roomFailures:
          typeof state.roomFailures === 'number' ? state.roomFailures : 0,
        history: Array.isArray(state.history) ? state.history : [],
        rolls: typeof state.rolls === 'number' ? state.rolls : 0,
        map: coerceMap(state.map),
        party: {
          ...state.party,
          embers: coerceEmbers(state.party),
          abilities: coerceAbilities(
            state.party.abilities,
            CLASSES[state.party.classId].abilities
          ),
          conditions: coerceConditions(
            (
              state.party as unknown as {
                conditions?: unknown;
                statuses?: unknown;
              }
            ).conditions ??
              (state.party as unknown as { statuses?: unknown }).statuses
          ),
        },
        room: {
          ...state.room,
          entities: Array.isArray(state.room.entities)
            ? state.room.entities
            : [],
          threats: Array.isArray(state.room.threats) ? state.room.threats : [],
          suggestions: Array.isArray(state.room.suggestions)
            ? state.room.suggestions
            : [],
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}
