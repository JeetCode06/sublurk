import { describe, it, expect } from 'vitest';
import {
  CLASSES,
  classRollModifier,
  classAdvantage,
} from '../src/server/game/classes';
import type { ClassId } from '../src/shared/game';

describe('classRollModifier', () => {
  it('gives the warrior a bonus in combat and a penalty in puzzles', () => {
    expect(classRollModifier('warrior', 'combat')).toBeGreaterThan(0);
    expect(classRollModifier('warrior', 'puzzle')).toBeLessThan(0);
  });

  it('gives the witch a bonus on puzzles', () => {
    expect(classRollModifier('witch', 'puzzle')).toBeGreaterThan(0);
  });

  it('gives the adventurer no modifier in any room', () => {
    expect(classRollModifier('adventurer', 'combat')).toBe(0);
    expect(classRollModifier('adventurer', 'boss')).toBe(0);
  });

  it('returns 0 for a room type the class has no affinity for', () => {
    expect(classRollModifier('healer', 'combat')).toBe(0);
  });
});

describe('CLASSES', () => {
  it('defines every class id', () => {
    const ids: ClassId[] = [
      'warrior',
      'witch',
      'healer',
      'trickster',
      'adventurer',
    ];
    for (const id of ids) {
      expect(CLASSES[id].id).toBe(id);
    }
  });
});

describe('classAdvantage', () => {
  it('grants advantage on a strength and disadvantage on a weakness', () => {
    expect(classAdvantage('warrior', 'combat')).toBe('advantage');
    expect(classAdvantage('warrior', 'puzzle')).toBe('disadvantage');
  });

  it('rolls normally for the balanced class', () => {
    expect(classAdvantage('adventurer', 'combat')).toBe('normal');
    expect(classAdvantage('adventurer', 'trap')).toBe('normal');
  });

  it('grants the witch advantage on puzzles and traps', () => {
    expect(classAdvantage('witch', 'puzzle')).toBe('advantage');
    expect(classAdvantage('witch', 'trap')).toBe('advantage');
  });
});