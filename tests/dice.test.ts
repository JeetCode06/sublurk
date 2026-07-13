import { describe, it, expect } from 'vitest';
import { rollCheck, combineAdvantage } from '../src/server/game/dice';

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

describe('rollCheck', () => {
  it('returns a partial when the total just misses the difficulty', () => {
    const check = rollCheck('str', 10, 12, 'normal', () => 0.45);
    expect(check.die).toBe(10);
    expect(check.outcome).toBe('partial');
  });

  it('fails when the total misses the difficulty badly', () => {
    const check = rollCheck('str', 10, 15, 'normal', () => 0.05);
    expect(check.die).toBe(2);
    expect(check.outcome).toBe('fail');
  });

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
