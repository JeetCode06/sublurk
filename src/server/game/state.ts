import type { ClassId, GameState, Party } from '../../shared/game';
import type { RandFn } from './dice';
import { CLASSES } from './classes';
import { createRoom } from './rooms';
import { DEFAULT_MAP, freshMap } from './map';

const STARTING_HP = 50;
const STARTING_GOLD = 0;
const DEFAULT_VOTE_THRESHOLD = 20;

export type NewGameInput = {
  postId: string;
  subredditName: string;
  classId: ClassId;
  theme: string;
};

function freshParty(classId: ClassId, name: string): Party {
  return {
    hp: STARTING_HP,
    maxHp: STARTING_HP,
    gold: STARTING_GOLD,
    depth: 0,
    inventory: [],
    conditions: [],
    classId,
    name,
    abilities: { ...CLASSES[classId].abilities },
  };
}

export function createInitialState(
  input: NewGameInput,
  rand: RandFn = Math.random
): GameState {
  const name = `The ${input.subredditName} ${CLASSES[input.classId].name}`;
  return {
    runNumber: 1,
    phase: 'awaiting_actions',
    postId: input.postId,
    theme: input.theme,
    party: freshParty(input.classId, name),
    room: createRoom(0, rand),
    map: freshMap(DEFAULT_MAP),
    intro: '',
    recentEvents: [],
    nextResolveAt: 0,
    voteThreshold: DEFAULT_VOTE_THRESHOLD,
  };
}

// Restarts after a death: a fresh party and dungeon, but the same sub identity.
export function startNewRun(
  state: GameState,
  rand: RandFn = Math.random
): GameState {
  return {
    ...state,
    runNumber: state.runNumber + 1,
    phase: 'awaiting_actions',
    party: freshParty(state.party.classId, state.party.name),
    room: createRoom(0, rand),
    map: freshMap(state.map),
    intro: '',
    recentEvents: [],
    nextResolveAt: 0,
  };
}