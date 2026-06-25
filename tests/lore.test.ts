import { describe, it, expect } from 'vitest';
import {
  tauntFromLore,
  recordFromState,
  type Lore,
} from '../src/server/game/lore';
import { createInitialState } from '../src/server/game/state';

const died = (runNumber: number) => ({
  runNumber,
  outcome: 'died' as const,
  depth: 2,
  location: 'The Roasting Pit',
  villain: 'the Bean Wraith',
});

describe('tauntFromLore', () => {
  it('is empty with no history', () => {
    expect(tauntFromLore({ runs: [] })).toBe('');
  });

  it('names the last fall on a single death', () => {
    const line = tauntFromLore({ runs: [died(1)] });
    expect(line).toContain('the Bean Wraith');
    expect(line).toContain('The Roasting Pit');
  });

  it('counts repeated deaths', () => {
    expect(tauntFromLore({ runs: [died(1), died(2)] })).toContain('Twice');
    expect(tauntFromLore({ runs: [died(1), died(2), died(3)] })).toContain(
      '3 times'
    );
  });

  it('acknowledges a past victory', () => {
    const lore: Lore = {
      runs: [
        {
          runNumber: 1,
          outcome: 'won',
          depth: 5,
          location: 'The Hollow Throne',
          villain: 'the Hollow King',
        },
      ],
    };
    expect(tauntFromLore(lore)).toContain('conquered');
  });
});

describe('recordFromState', () => {
  it('captures the outcome, run number, location, and villain', () => {
    const state = createInitialState({
      postId: 't3_x',
      subredditName: 'coffee',
      classId: 'warrior',
      theme: 'a roastery dungeon',
    });
    const record = recordFromState({
      ...state,
      phase: 'dead',
      party: { ...state.party, depth: 1 },
    });
    expect(record.outcome).toBe('died');
    expect(record.runNumber).toBe(1);
    expect(record.location.length).toBeGreaterThan(0);
    expect(record.villain.length).toBeGreaterThan(0);
  });
});