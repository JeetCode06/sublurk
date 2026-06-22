import { describe, it, expect } from 'vitest';
import {
  rollAction,
  rollCheck,
  combineAdvantage,
} from '../src/server/game/dice';

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

describe('rollAction', () => {
  it('treats a natural 20 as success even against an impossible difficulty', () => {
    const roll = rollAction(99, 0, () => 0.999);
    expect(roll.die).toBe(20);
    expect(roll.outcome).toBe('success');
  });

  it('treats a natural 1 as failure even with a huge modifier', () => {
    const roll = rollAction(1, 50, () => 0);
    expect(roll.die).toBe(1);
    expect(roll.outcome).toBe('fail');
  });

  it('succeeds when the total meets or beats the difficulty', () => {
    const roll = rollAction(10, 5, () => 0.5);
    expect(roll.die).toBe(11);
    expect(roll.total).toBe(16);
    expect(roll.outcome).toBe('success');
  });

  it('returns a partial when the total just misses the difficulty', () => {
    const roll = rollAction(12, 0, () => 0.45);
    expect(roll.die).toBe(10);
    expect(roll.outcome).toBe('partial');
  });

  it('fails when the total misses the difficulty badly', () => {
    const roll = rollAction(15, 0, () => 0.05);
    expect(roll.die).toBe(2);
    expect(roll.outcome).toBe('fail');
  });

  it('applies the modifier to the total', () => {
    const roll = rollAction(10, 3, () => 0.5);
    expect(roll.total).toBe(14);
  });
});

describe('rollCheck', () => {
  it('adds the ability modifier to the die', () => {
    const check = rollCheck('str', 16, 10, 'normal', () => 0.5);
    expect(check.die).toBe(11);
    expect(check.modifier).toBe(3);
    expect(check.total).toBe(14);
    expect(check.outcome).toBe('success');
  });

  it('rolls a single die when normal', () => {
    const check = rollCheck('int', 10, 10, 'normal', seq([0.5, 0.9]));
    expect(check.rolls).toHaveLength(1);
    expect(check.die).toBe(11);
  });

  it('keeps the higher of two dice with advantage', () => {
    const check = rollCheck('dex', 10, 10, 'advantage', seq([0.1, 0.9]));
    expect(check.rolls).toEqual([3, 19]);
    expect(check.die).toBe(19);
  });

  it('keeps the lower of two dice with disadvantage', () => {
    const check = rollCheck('dex', 10, 10, 'disadvantage', seq([0.1, 0.9]));
    expect(check.rolls).toEqual([3, 19]);
    expect(check.die).toBe(3);
    expect(check.outcome).toBe('fail');
  });

  it('applies the natural 1 and 20 rules to the chosen die', () => {
    const win = rollCheck('str', 0, 99, 'advantage', seq([0, 0.999]));
    expect(win.die).toBe(20);
    expect(win.outcome).toBe('success');

    const lose = rollCheck('str', 18, 1, 'disadvantage', seq([0, 0.999]));
    expect(lose.die).toBe(1);
    expect(lose.outcome).toBe('fail');
  });
});

describe('combineAdvantage', () => {
  it('cancels advantage and disadvantage to a normal roll', () => {
    expect(combineAdvantage('advantage', 'disadvantage')).toBe('normal');
    expect(combineAdvantage('disadvantage', 'advantage')).toBe('normal');
  });

  it('keeps advantage when only advantage is present', () => {
    expect(combineAdvantage('advantage', 'normal')).toBe('advantage');
  });

  it('keeps disadvantage when only disadvantage is present', () => {
    expect(combineAdvantage('normal', 'disadvantage')).toBe('disadvantage');
  });

  it('is normal when neither side has an edge', () => {
    expect(combineAdvantage('normal', 'normal')).toBe('normal');
  });
});