import type { Abilities, ClassId, RoomType } from './game';

export const STRONG = 3;
export const WEAK = -2;

export type ClassInfo = {
  id: ClassId;
  name: string;
  affinities: Partial<Record<RoomType, number>>;
  abilities: Abilities;
  signature: string;
};

export const CLASS_INFO: Record<ClassId, ClassInfo> = {
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

// Canonical ordering of the class ids, for iterating the roster deterministically.
export const CLASS_IDS: ClassId[] = [
  'warrior',
  'witch',
  'healer',
  'trickster',
  'adventurer',
];

// The base archetype name for each class, used as the fallback whenever a
// subreddit has no themed name for it.
export const BASE_CLASS_NAMES: Record<ClassId, string> = {
  warrior: CLASS_INFO.warrior.name,
  witch: CLASS_INFO.witch.name,
  healer: CLASS_INFO.healer.name,
  trickster: CLASS_INFO.trickster.name,
  adventurer: CLASS_INFO.adventurer.name,
};

// Splits a class's room affinities into the rooms it is strong and weak in, for
// display on the character screen.
export function classAffinitySummary(id: ClassId): {
  strong: RoomType[];
  weak: RoomType[];
} {
  const strong: RoomType[] = [];
  const weak: RoomType[] = [];
  for (const [room, value] of Object.entries(CLASS_INFO[id].affinities)) {
    if (typeof value !== 'number') continue;
    if (value > 0) strong.push(room as RoomType);
    else if (value < 0) weak.push(room as RoomType);
  }
  return { strong, weak };
}