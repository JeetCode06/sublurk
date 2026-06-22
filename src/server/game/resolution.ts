import type {
  AbilityCheck,
  Advantage,
  GameState,
  ResolveResult,
} from '../../shared/game';
import type { RandFn } from './dice';
import { rollCheck, combineAdvantage } from './dice';
import { abilityForRoomType } from './abilities';
import { classAdvantage } from './classes';
import { checkDisadvantageFrom } from './conditions';
import { createRoom, createFinalBossRoom } from './rooms';
import { advanceMapForDepth, atFinalBoss, markBossDefeated } from './map';
import { applyResolveResult } from './validation';

const RECENT_EVENTS_LIMIT = 6;

// Rolls for the current room: its difficulty against the party class's affinity.
// Runs before the AI, so the AI can narrate consistently with the result.
export function prepareRoll(
  state: GameState,
  rand: RandFn = Math.random
): AbilityCheck {
  const ability = abilityForRoomType(state.room.type);
  const score = state.party.abilities[ability];
  const fromClass = classAdvantage(state.party.classId, state.room.type);
  const fromConditions: Advantage = checkDisadvantageFrom(
    state.party.conditions
  )
    ? 'disadvantage'
    : 'normal';
  const advantage = combineAdvantage(fromClass, fromConditions);
  return rollCheck(ability, score, state.room.difficulty, advantage, rand);
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

    // Resolving the room at the final location is the campaign's climax —
    // defeating the boss wins the run.
    if (atFinalBoss(state.map)) {
      return {
        ...state,
        party: { ...applied.party, depth },
        map: markBossDefeated(state.map),
        phase: 'won',
        recentEvents,
      };
    }

    // Otherwise advance: reaching the final location spawns the boss; before
    // that, generate the next ordinary room.
    const map = advanceMapForDepth(state.map, depth);
    const room = atFinalBoss(map)
      ? createFinalBossRoom(depth)
      : createRoom(depth, rand);
    return {
      ...state,
      party: { ...applied.party, depth },
      room,
      map,
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