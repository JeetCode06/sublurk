import { describe, it, expect } from 'vitest';
import { createInitialState, startNewRun } from '../src/server/game/state';
import type { GameState } from '../src/shared/game';

const input = {
  postId: 't3_abc',
  subredditName: 'r/witchcraft',
  classId: 'witch' as const,
  theme: 'mossy catacombs',
};

function deadState(): GameState {
  const base = createInitialState(input, () => 0);
  return {
    ...base,
    runNumber: 3,
    phase: 'dead',
    party: {
      ...base.party,
      hp: 0,
      depth: 12,
      inventory: ['cursed idol'],
      statuses: ['poisoned'],
    },
    recentEvents: ['the coven fell'],
  };
}

describe('createInitialState', () => {
  it('starts run 1 with a full, fresh party', () => {
    const state = createInitialState(input, () => 0);
    expect(state.runNumber).toBe(1);
    expect(state.party.hp).toBe(state.party.maxHp);
    expect(state.party.depth).toBe(0);
    expect(state.phase).toBe('awaiting_actions');
  });

  it('names the party from the subreddit and its class', () => {
    const state = createInitialState(input, () => 0);
    expect(state.party.name).toBe('The r/witchcraft Coven');
  });

  it('carries the postId and theme through', () => {
    const state = createInitialState(input, () => 0);
    expect(state.postId).toBe('t3_abc');
    expect(state.theme).toBe('mossy catacombs');
  });

  it('starts with a room and a non-zero vote threshold', () => {
    const state = createInitialState(input, () => 0);
    expect(state.room.description).toBe('');
    expect(state.voteThreshold).toBeGreaterThan(0);
  });
});

describe('startNewRun', () => {
  it('increments the run number', () => {
    expect(startNewRun(deadState(), () => 0).runNumber).toBe(4);
  });

  it('revives the party at full health and depth 0', () => {
    const next = startNewRun(deadState(), () => 0);
    expect(next.party.hp).toBe(next.party.maxHp);
    expect(next.party.depth).toBe(0);
    expect(next.party.inventory).toEqual([]);
    expect(next.party.statuses).toEqual([]);
  });

  it('keeps the subreddit identity across runs', () => {
    const next = startNewRun(deadState(), () => 0);
    expect(next.party.classId).toBe('witch');
    expect(next.party.name).toBe('The r/witchcraft Coven');
    expect(next.postId).toBe('t3_abc');
    expect(next.theme).toBe('mossy catacombs');
  });

  it('clears the recent-events log', () => {
    expect(startNewRun(deadState(), () => 0).recentEvents).toEqual([]);
  });

  it('does not mutate the dead state', () => {
    const dead = deadState();
    startNewRun(dead, () => 0);
    expect(dead.runNumber).toBe(3);
    expect(dead.party.hp).toBe(0);
  });
});