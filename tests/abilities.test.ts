import { describe, it, expect } from 'vitest';
import {
  ABILITY_IDS,
  abilityModifier,
  abilityForRoomType,
  combatAbility,
  coerceAbilities,
} from '../src/server/game/abilities';
import { CLASSES } from '../src/server/game/classes';
import type { Abilities, ClassId } from '../src/shared/game';

const AVERAGE: Abilities = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

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
    expect(coerceAbilities(scores, AVERAGE)).toEqual(scores);
  });

  it('fills missing or non-numeric scores from the fallback', () => {
    const fallback = CLASSES.witch.abilities;
    const repaired = coerceAbilities({ int: 18, dex: 'oops' }, fallback);
    expect(repaired.int).toBe(18);
    expect(repaired.dex).toBe(fallback.dex);
    expect(repaired.str).toBe(fallback.str);
  });

  it('returns the fallback for non-object input', () => {
    expect(coerceAbilities(null, AVERAGE)).toEqual(AVERAGE);
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

describe('abilityForRoomType', () => {
  it('maps each room type to the ability it tests', () => {
    expect(abilityForRoomType('combat')).toBe('str');
    expect(abilityForRoomType('boss')).toBe('str');
    expect(abilityForRoomType('puzzle')).toBe('int');
    expect(abilityForRoomType('trap')).toBe('dex');
    expect(abilityForRoomType('treasure')).toBe('wis');
    expect(abilityForRoomType('npc')).toBe('cha');
    expect(abilityForRoomType('rest')).toBe('con');
  });
});

describe('combatAbility', () => {
  it('picks the stronger of Strength and Dexterity', () => {
    expect(
      combatAbility({ str: 16, dex: 12, con: 10, int: 10, wis: 10, cha: 10 })
    ).toBe('str');
    expect(
      combatAbility({ str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 })
    ).toBe('dex');
  });

  it('breaks ties toward Strength', () => {
    expect(
      combatAbility({ str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 })
    ).toBe('str');
  });
});
