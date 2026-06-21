import type { Abilities, AbilityId } from '../../shared/game';

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

// An average human in every ability — the safe fallback when a party's scores
// are missing or unreadable.
export const DEFAULT_ABILITIES: Abilities = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

// Standard tabletop modifier: every two points above or below 10 shifts the
// bonus by one. Score 10 is +0, 16 is +3, 8 is -1.
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// Forces parsed-but-untrusted ability data into a complete set, repairing each
// missing or non-numeric score from the fallback (usually the party's class
// scores). Used when reading an older or partial party from storage.
export function coerceAbilities(raw: unknown, fallback: Abilities): Abilities {
  const source =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  const out = {} as Abilities;
  for (const id of ABILITY_IDS) {
    const value = source[id];
    out[id] =
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback[id];
  }
  return out;
}