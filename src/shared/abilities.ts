import type { AbilityId } from './game';

// Canonical ordering of the six abilities, shared by the server engine and the
// client stat displays so both always agree.
export const ABILITY_IDS: AbilityId[] = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
];

export const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const ABILITY_SHORT: Record<AbilityId, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

// Standard tabletop modifier: every two points above or below 10 shifts the
// bonus by one. Score 10 is +0, 16 is +3, 8 is -1.
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
