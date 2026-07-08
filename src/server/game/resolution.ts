import type {
  AbilityCheck,
  Advantage,
  GameState,
  Party,
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
import type { TurnEffects } from './effects';
import {
  maybeSurvive,
  CURSE_DIFFICULTY_DROP,
  rerollNote,
  curseNote,
} from './signatures';

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

// The full pre-AI roll for a turn, applying the signatures that fire before the
// narrator speaks: a Wizard curses the floor's foe to ease a combat or boss
// check, and a Rogue rerolls a failed check and keeps the new roll. Returns the
// kept check, the party with any per-floor signature marked spent, and a note
// for whatever fired (null if none).
export function rollTurn(
  state: GameState,
  rand: RandFn = Math.random
): { check: AbilityCheck; party: Party; note: string | null } {
  const { party, room } = state;
  const isCombat = room.type === 'combat' || room.type === 'boss';

  let rollState = state;
  let nextParty = party;
  let note: string | null = null;
  if (
    party.classId === 'witch' &&
    isCombat &&
    (party.curseDepth ?? -1) !== party.depth
  ) {
    nextParty = { ...party, curseDepth: party.depth };
    rollState = {
      ...state,
      party: nextParty,
      room: {
        ...room,
        difficulty: Math.max(1, room.difficulty - CURSE_DIFFICULTY_DROP),
      },
    };
    note = curseNote(party.name);
  }

  const check = prepareRoll(rollState, rand);

  if (
    nextParty.classId === 'trickster' &&
    check.outcome === 'fail' &&
    (nextParty.rerollDepth ?? -1) !== nextParty.depth
  ) {
    return {
      check: prepareRoll(rollState, rand),
      party: { ...nextParty, rerollDepth: nextParty.depth },
      note: rerollNote(nextParty.name),
    };
  }

  return { check, party: nextParty, note };
}

// Runs after the AI: validates its result, then advances the run by continuing
// the room, moving to the next one, or ending the run on death.
export function applyTurn(
  state: GameState,
  result: ResolveResult,
  rand: RandFn = Math.random,
  effects: TurnEffects | null = null,
  signatureNote: string | null = null
): GameState {
  // The server can override the party's HP and embers for this turn — combat
  // damage, rest healing, or a shrine offering's cost — in which case the model's
  // proposed deltas are ignored.
  const effective: ResolveResult =
    effects === null
      ? result
      : {
          ...result,
          ...(effects.hpDelta !== undefined
            ? { hpDelta: effects.hpDelta }
            : {}),
          ...(effects.embersDelta !== undefined
            ? { embersDelta: effects.embersDelta }
            : {}),
        };
  const applied = applyResolveResult(state.party, effective);
  // A Fighter shrugs off one killing blow per run before the death is final.
  const survival = maybeSurvive(applied.party, applied.died);
  const party = survival.party;

  // The turn's beat is the AI narration plus any signature that fired, so a
  // reroll, curse, or last stand is visible rather than a silent stat change.
  const beat = [result.narration, signatureNote, survival.note]
    .filter((s): s is string => s !== null && s.length > 0)
    .join(' ');
  const recentEvents = [...state.recentEvents, beat]
    .filter((event) => event.length > 0)
    .slice(-RECENT_EVENTS_LIMIT);

  if (survival.died) {
    return { ...state, party, phase: 'dead', recentEvents };
  }

  // Track consecutive failures in this room. Once they hit the limit the party
  // is forced onward even on a failed roll, so the room cannot loop forever.
  const failures = result.outcome === 'fail' ? state.roomFailures + 1 : 0;
  // A room ends when the model resolves it or the server forces it (every foe
  // fell, or a rest completed); the stuck-limit still forces a way out.
  const forced = effects?.resolve ?? false;
  const resolved = result.roomResolved || forced || failures >= STUCK_LIMIT;

  if (resolved) {
    const depth = state.party.depth + 1;
    // Overcoming a room pays embers scaled to its difficulty; a rest and a
    // stuck-limit exit are not victories and pay nothing.
    const paid = result.roomResolved || (effects?.reward ?? false);
    const embers = paid ? party.embers + state.room.difficulty : party.embers;
    const clearedParty = { ...party, depth, embers };

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
    party,
    room: {
      ...state.room,
      ...(effects?.entities ? { entities: effects.entities } : {}),
      suggestions: result.suggestions,
    },
    phase: 'awaiting_actions',
    recentEvents,
    roomFailures: failures,
  };
}