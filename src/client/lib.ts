import type { AbilityCheck, AbilityId } from '../shared/game';

export const ABILITY_ORDER: AbilityId[] = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
];

export const ABILITY_SHORT: Record<AbilityId, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function abilityModColor(mod: number): string {
  if (mod > 0) return 'text-[#e8893f]';
  if (mod < 0) return 'text-[#c0705a]';
  return 'text-[#6a5d52]';
}

export function advantageNote(advantage: AbilityCheck['advantage']): string {
  if (advantage === 'advantage') return ' · advantage';
  if (advantage === 'disadvantage') return ' · disadvantage';
  return '';
}

export function outcomeTone(outcome: AbilityCheck['outcome']): string {
  if (outcome === 'success') return 'text-[#7fb069]';
  if (outcome === 'partial') return 'text-[#e8c050]';
  return 'text-[#c0705a]';
}
