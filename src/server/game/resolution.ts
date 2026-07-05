import type {
  AbilityCheck,
  Advantage,
  GameState,
  ResolveResult,
} from '../../shared/game';
import type { RandFn } from './dice';
import { rollCheck, combineAdvantage } from './dice';
import { abilityForRoomType, combatAbility } from './abilities';
import { classAdvantage } from './classes';
import { checkDisadvantageFrom } from './conditions';
import { createRoom, createFinalBossRoom } from './rooms';
import { advanceMapForDepth, atFinalBoss, markBossDefeated } from './map';
import { applyResolveResult } from './validation';
import type { CombatResult } from './combat';

const RECENT_EVENTS_LIMIT = 6;

// After this many consecutive failed turns in one room, the party is forced
// onward no matter the roll, so a room can never trap them in an endless loop.
export const STUCK_LIMIT = 4;

// Rolls for the current room: its difficulty against the party class's affinity.
// Runs before the AI, so the AI can narrate consistently with the result.
export function prepareRoll(
  state: GameState,
  rand: RandFn = Math.random
): AbilityCheck {
  const { type } = state.room;
  const ability =
    type === 'combat' || type === 'boss'
      ? combatAbility(state.party.abilities)
      : abilityForRoomType(type);
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
  rand: RandFn = Math.random,
  combat: CombatResult | null = null
): GameState {
  // In combat the server decides the party's health: they take the foes'
  // counterattack, not whatever hpDelta the model proposed.
  const effective = combat
    ? { ...result, hpDelta: -combat.partyDamage }
    : result;
  const applied = applyResolveResult(state.party, effective);
  const recentEvents = [...state.recentEvents, result.narration]
    .filter((event) => event.length > 0)
    .slice(-RECENT_EVENTS_LIMIT);

  if (applied.died) {
    return { ...state, party: applied.party, phase: 'dead', recentEvents };
  }

  // Track consecutive failures in this room. Once they hit the limit the party
  // is forced onward even on a failed roll, so the room cannot loop forever.
  const failures = result.outcome === 'fail' ? state.roomFailures + 1 : 0;
  // A room is genuinely cleared when the model resolves it or every foe falls;
  // the stuck-limit forcing the party onward is not a clear and pays nothing.
  const genuineClear = result.roomResolved || (combat?.allFoesDead ?? false);
  const resolved = genuineClear || failures >= STUCK_LIMIT;

  if (resolved) {
    const depth = state.party.depth + 1;
    // Clearing a room pays gold scaled to its difficulty, so deeper, harder
    // rooms pay more; being forced out by the stuck-limit pays nothing.
    const gold = genuineClear
      ? applied.party.gold + state.room.difficulty
      : applied.party.gold;
    const clearedParty = { ...applied.party, depth, gold };

    // Resolving the room at the final location is the campaign's climax —
    // defeating the boss wins the run.
    if (atFinalBoss(state.map)) {
      return {
        ...state,
        party: clearedParty,
        map: markBossDefeated(state.map),
        phase: 'won',
        recentEvents,
        roomFailures: 0,
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
      party: clearedParty,
      room,
      map,
      phase: 'awaiting_actions',
      recentEvents,
      roomFailures: 0,
    };
  }

  // Mid-encounter: hold the room, but bank any combat damage dealt to its foes
  // so their health carries into the next exchange.
  return {
    ...state,
    party: applied.party,
    room: {
      ...state.room,
      ...(combat ? { entities: combat.updatedEntities } : {}),
      suggestions: result.suggestions,
    },
    phase: 'awaiting_actions',
    recentEvents,
    roomFailures: failures,
  };
}