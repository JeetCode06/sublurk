import type { Room, RoomType } from '../../shared/game';
import type { RandFn } from './dice';

type RoomArchetype = {
  type: RoomType;
  baseDifficulty: number;
  weight: number;
};

const BOSS_INTERVAL = 5;
const DIFFICULTY_PER_DEPTH = 0.5;

const ARCHETYPES: RoomArchetype[] = [
  { type: 'combat', baseDifficulty: 11, weight: 4 },
  { type: 'puzzle', baseDifficulty: 12, weight: 2 },
  { type: 'trap', baseDifficulty: 12, weight: 2 },
  { type: 'treasure', baseDifficulty: 8, weight: 2 },
  { type: 'npc', baseDifficulty: 10, weight: 2 },
  { type: 'shop', baseDifficulty: 6, weight: 1 },
  { type: 'rest', baseDifficulty: 5, weight: 1 },
];

function scaleDifficulty(base: number, depth: number): number {
  return Math.round(base + depth * DIFFICULTY_PER_DEPTH);
}

function pickArchetype(rand: RandFn): RoomArchetype {
  const totalWeight = ARCHETYPES.reduce((sum, a) => sum + a.weight, 0);
  let roll = rand() * totalWeight;
  for (const archetype of ARCHETYPES) {
    roll -= archetype.weight;
    if (roll < 0) return archetype;
  }
  // rand() returns [0, 1), so roll is always below totalWeight and the loop returns.
  throw new Error('pickArchetype: no archetype selected');
}

export function createRoom(depth: number, rand: RandFn = Math.random): Room {
  if (depth > 0 && depth % BOSS_INTERVAL === 0) {
    return {
      type: 'boss',
      description: '',
      difficulty: scaleDifficulty(14, depth),
      entities: [],
      threats: [],
      situation: {},
    };
  }

  const archetype = pickArchetype(rand);
  return {
    type: archetype.type,
    description: '',
    difficulty: scaleDifficulty(archetype.baseDifficulty, depth),
    entities: [],
    threats: [],
    situation: {},
  };
}

// The campaign's climactic encounter at the final location. Tougher than the
// minor bosses sprinkled through the run; resolving it wins the campaign.
export function createFinalBossRoom(depth: number): Room {
  return {
    type: 'boss',
    description: '',
    difficulty: scaleDifficulty(18, depth),
    entities: [],
    threats: [],
    situation: {},
  };
}