import { describe, it, expect } from 'vitest';
import { rollAction } from '../src/server/game/dice';

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