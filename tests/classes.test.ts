import { describe, it, expect } from 'vitest';
import { CLASSES, classAdvantage } from '../src/server/game/classes';
import { classAffinitySummary } from '../src/shared/classes';
import type { ClassId } from '../src/shared/game';

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

describe('classAffinitySummary', () => {
  it('splits affinities into strong and weak rooms', () => {
    const fighter = classAffinitySummary('warrior');
    expect(fighter.strong).toEqual(expect.arrayContaining(['combat', 'boss']));
    expect(fighter.weak).toEqual(['puzzle']);
  });

  it('returns empty lists for the balanced class', () => {
    expect(classAffinitySummary('adventurer')).toEqual({
      strong: [],
      weak: [],
    });
  });
});
