import type { Room, RoomType } from '../../shared/game';
import type { RandFn } from './dice';
import { bandForRoom, dcForBand } from './difficulty';

type RoomArchetype = {
  type: RoomType;
  weight: number;
};

const BOSS_INTERVAL = 5;

const ARCHETYPES: RoomArchetype[] = [
  { type: 'combat', weight: 4 },
  { type: 'puzzle', weight: 2 },
  { type: 'trap', weight: 2 },
  { type: 'treasure', weight: 2 },
  { type: 'npc', weight: 2 },
  { type: 'shop', weight: 1 },
  { type: 'rest', weight: 1 },
];

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
      difficulty: dcForBand(bandForRoom('boss', depth)),
      entities: [],
      threats: [],
      suggestions: [],
      situation: {},
    };
  }

  const archetype = pickArchetype(rand);
  return {
    type: archetype.type,
    description: '',
    difficulty: dcForBand(bandForRoom(archetype.type, depth)),
    entities: [],
    threats: [],
    suggestions: [],
    situation: {},
  };
}

// The campaign's climactic encounter at the final location. A band tougher than
// the ordinary bosses sprinkled through the run; resolving it wins the campaign.
export function createFinalBossRoom(depth: number): Room {
  return {
    type: 'boss',
    description: '',
    difficulty: dcForBand(bandForRoom('boss', depth)),
    entities: [],
    threats: [],
    suggestions: [],
    situation: {},
  };
}