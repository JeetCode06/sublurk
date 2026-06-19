import type { GameState, ResolveResult } from '../../shared/game';
import type { DiceRoll, RandFn } from './dice';
import { rollAction } from './dice';
import { classRollModifier } from './classes';
import { createRoom } from './rooms';
import { applyResolveResult } from './validation';

const RECENT_EVENTS_LIMIT = 6;

// Rolls for the current room: its difficulty against the party class's affinity.
// Runs before the AI, so the AI can narrate consistently with the result.
export function prepareRoll(
  state: GameState,
  rand: RandFn = Math.random
): DiceRoll {
  const modifier = classRollModifier(state.party.classId, state.room.type);
  return rollAction(state.room.difficulty, modifier, rand);
}

// Runs after the AI: validates its result, then advances the run by continuing
// the room, moving to the next one, or ending the run on death.
export function applyTurn(
  state: GameState,
  result: ResolveResult,
  rand: RandFn = Math.random
): GameState {
  const applied = applyResolveResult(state.party, result);
  const recentEvents = [...state.recentEvents, result.narration]
    .filter((event) => event.length > 0)
    .slice(-RECENT_EVENTS_LIMIT);

  if (applied.died) {
    return { ...state, party: applied.party, phase: 'dead', recentEvents };
  }

  if (result.roomResolved) {
    const depth = state.party.depth + 1;
    return {
      ...state,
      party: { ...applied.party, depth },
      room: createRoom(depth, rand),
      phase: 'awaiting_actions',
      recentEvents,
    };
  }

  return {
    ...state,
    party: applied.party,
    phase: 'awaiting_actions',
    recentEvents,
  };
}