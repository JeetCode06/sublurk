import { describe, it, expect } from 'vitest';
import {
  CONDITION_IDS,
  CONDITIONS,
  coerceConditions,
  applyConditions,
  checkDisadvantageFrom,
  conditionHpTick,
} from '../src/server/game/conditions';

describe('CONDITIONS data', () => {
  it('has a named entry for every condition id', () => {
    for (const id of CONDITION_IDS) {
      expect(CONDITIONS[id].name.length).toBeGreaterThan(0);
    }
  });
});

describe('coerceConditions', () => {
  it('keeps known ids and drops unknown words', () => {
    expect(coerceConditions(['poisoned', 'blessed', 'charmed'])).toEqual([
      'poisoned',
      'charmed',
    ]);
  });

  it('lower-cases, trims, and de-duplicates', () => {
    expect(coerceConditions([' Poisoned ', 'POISONED', 'frightened'])).toEqual([
      'poisoned',
      'frightened',
    ]);
  });

  it('returns an empty array for non-array input', () => {
    expect(coerceConditions('poisoned')).toEqual([]);
    expect(coerceConditions(undefined)).toEqual([]);
    expect(coerceConditions(null)).toEqual([]);
  });
});

describe('applyConditions', () => {
  it('adds coerced conditions and removes by id', () => {
    expect(
      applyConditions(['poisoned'], ['frightened', 'bogus'], ['poisoned'])
    ).toEqual(['frightened']);
  });

  it('does not duplicate an already-present condition', () => {
    expect(applyConditions(['poisoned'], ['poisoned'], [])).toEqual([
      'poisoned',
    ]);
  });
});

describe('checkDisadvantageFrom', () => {
  it('is true when any condition is active', () => {
    expect(checkDisadvantageFrom(['frightened'])).toBe(true);
  });

  it('is false with no conditions', () => {
    expect(checkDisadvantageFrom([])).toBe(false);
  });
});

describe('conditionHpTick', () => {
  it('sums the per-turn drain of active conditions', () => {
    expect(conditionHpTick(['poisoned'])).toBe(1);
    expect(conditionHpTick(['poisoned', 'exhausted'])).toBe(3);
  });

  it('is zero for conditions that do not drain health', () => {
    expect(conditionHpTick(['frightened', 'blinded'])).toBe(0);
    expect(conditionHpTick([])).toBe(0);
  });
});