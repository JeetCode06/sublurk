import type { ClassId, RoomType } from '../../shared/game';

export type ClassDefinition = {
  id: ClassId;
  name: string;
  affinities: Partial<Record<RoomType, number>>;
  signature: string;
};

const STRONG = 3;
const WEAK = -2;

export const CLASSES: Record<ClassId, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    name: 'Warband',
    affinities: { combat: STRONG, boss: STRONG, puzzle: WEAK },
    signature: 'Survives one killing blow per run at 1 HP.',
  },
  witch: {
    id: 'witch',
    name: 'Coven',
    affinities: { puzzle: STRONG, trap: STRONG, combat: WEAK },
    signature: 'Curses one enemy per floor, lowering its difficulty.',
  },
  healer: {
    id: 'healer',
    name: 'Circle',
    affinities: { npc: STRONG, rest: STRONG },
    signature: 'Recovers extra HP in rest rooms.',
  },
  trickster: {
    id: 'trickster',
    name: 'Guild',
    affinities: { trap: STRONG, treasure: STRONG, combat: WEAK },
    signature: 'Re-rolls one failed action per floor.',
  },
  adventurer: {
    id: 'adventurer',
    name: 'Expedition',
    affinities: {},
    signature: 'A balanced party with no weaknesses.',
  },
};

export function classRollModifier(
  classId: ClassId,
  roomType: RoomType
): number {
  return CLASSES[classId].affinities[roomType] ?? 0;
}