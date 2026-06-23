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
      conditions: ['poisoned'],
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
    expect(state.party.name).toBe('The r/witchcraft Wizard');
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

  it('starts with an empty intro, to be filled at run start', () => {
    expect(createInitialState(input, () => 0).intro).toBe('');
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
    expect(next.party.conditions).toEqual([]);
  });

  it('keeps the subreddit identity across runs', () => {
    const next = startNewRun(deadState(), () => 0);
    expect(next.party.classId).toBe('witch');
    expect(next.party.name).toBe('The r/witchcraft Wizard');
    expect(next.postId).toBe('t3_abc');
    expect(next.theme).toBe('mossy catacombs');
  });

  it('clears the recent-events log', () => {
    expect(startNewRun(deadState(), () => 0).recentEvents).toEqual([]);
  });

  it('clears the intro so the new run gets a fresh cold open', () => {
    const prior = { ...deadState(), intro: 'the old opening' };
    expect(startNewRun(prior, () => 0).intro).toBe('');
  });

  it('does not mutate the dead state', () => {
    const dead = deadState();
    startNewRun(dead, () => 0);
    expect(dead.runNumber).toBe(3);
    expect(dead.party.hp).toBe(0);
  });
});

describe('roomFailures', () => {
  it('starts at zero', () => {
    expect(createInitialState(input, () => 0).roomFailures).toBe(0);
  });

  it('resets on a new run', () => {
    const prior = { ...deadState(), roomFailures: 3 };
    expect(startNewRun(prior, () => 0).roomFailures).toBe(0);
  });
});