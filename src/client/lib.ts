import type { AbilityCheck } from '../shared/game';

// One source of truth with the server engine for ability order, labels, and
// the modifier math.
export {
  ABILITY_IDS as ABILITY_ORDER,
  ABILITY_SHORT,
  abilityModifier as abilityMod,
} from '../shared/abilities';

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
