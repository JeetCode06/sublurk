import { describe, it, expect } from 'vitest';
import {
  ABILITY_IDS,
  DEFAULT_ABILITIES,
  abilityModifier,
  coerceAbilities,
} from '../src/server/game/abilities';
import { CLASSES } from '../src/server/game/classes';
import type { ClassId } from '../src/shared/game';

describe('abilityModifier', () => {
  it('matches the standard tabletop curve', () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(11)).toBe(0);
    expect(abilityModifier(12)).toBe(1);
    expect(abilityModifier(16)).toBe(3);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(7)).toBe(-2);
  });
});

describe('coerceAbilities', () => {
  it('keeps a complete, valid set unchanged', () => {
    const scores = { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 10 };
    expect(coerceAbilities(scores, DEFAULT_ABILITIES)).toEqual(scores);
  });

  it('fills missing or non-numeric scores from the fallback', () => {
    const fallback = CLASSES.witch.abilities;
    const repaired = coerceAbilities({ int: 18, dex: 'oops' }, fallback);
    expect(repaired.int).toBe(18);
    expect(repaired.dex).toBe(fallback.dex);
    expect(repaired.str).toBe(fallback.str);
  });

  it('returns the fallback for non-object input', () => {
    expect(coerceAbilities(null, DEFAULT_ABILITIES)).toEqual(DEFAULT_ABILITIES);
  });
});

describe('class ability data', () => {
  it('gives every class a complete set of scores', () => {
    for (const id of Object.keys(CLASSES) as ClassId[]) {
      for (const ability of ABILITY_IDS) {
        expect(typeof CLASSES[id].abilities[ability]).toBe('number');
      }
    }
  });
});