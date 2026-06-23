import type {
  Abilities,
  Advantage,
  ClassId,
  RoomType,
} from '../../shared/game';

export type ClassDefinition = {
  id: ClassId;
  name: string;
  affinities: Partial<Record<RoomType, number>>;
  abilities: Abilities;
  signature: string;
};

const STRONG = 3;
const WEAK = -2;

export const CLASSES: Record<ClassId, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    name: 'Fighter',
    affinities: { combat: STRONG, boss: STRONG, puzzle: WEAK },
    abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 10 },
    signature: 'Survives one killing blow per run at 1 HP.',
  },
  witch: {
    id: 'witch',
    name: 'Wizard',
    affinities: { puzzle: STRONG, trap: STRONG, combat: WEAK },
    abilities: { str: 8, dex: 12, con: 10, int: 16, wis: 14, cha: 10 },
    signature: 'Curses one enemy per floor, lowering its difficulty.',
  },
  healer: {
    id: 'healer',
    name: 'Cleric',
    affinities: { npc: STRONG, rest: STRONG },
    abilities: { str: 10, dex: 10, con: 12, int: 12, wis: 16, cha: 14 },
    signature: 'Recovers extra HP in rest rooms.',
  },
  trickster: {
    id: 'trickster',
    name: 'Rogue',
    affinities: { trap: STRONG, treasure: STRONG, combat: WEAK },
    abilities: { str: 10, dex: 16, con: 10, int: 12, wis: 10, cha: 14 },
    signature: 'Re-rolls one failed action per floor.',
  },
  adventurer: {
    id: 'adventurer',
    name: 'Wanderer',
    affinities: {},
    abilities: { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 },
    signature: 'Balanced, with no weaknesses.',
  },
};

// Recasts a class's room affinity as tabletop advantage: a strength grants
// advantage, a weakness imposes disadvantage, and everything else rolls normally.
export function classAdvantage(
  classId: ClassId,
  roomType: RoomType
): Advantage {
  const affinity = CLASSES[classId].affinities[roomType] ?? 0;
  if (affinity > 0) return 'advantage';
  if (affinity < 0) return 'disadvantage';
  return 'normal';
}