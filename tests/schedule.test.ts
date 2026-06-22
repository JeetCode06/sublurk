import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/shared/game';
import { DEFAULT_ABILITIES } from '../src/server/game/abilities';
import {
  TURN_CADENCE_MS,
  withDeadline,
  turnStartedAt,
  isDue,
} from '../src/server/schedule';

const base: GameState = {
  runNumber: 1,
  phase: 'awaiting_actions',
  postId: 't3_x',
  theme: 'caves',
  party: {
    hp: 50,
    maxHp: 50,
    gold: 0,
    depth: 0,
    inventory: [],
    conditions: [],
    classId: 'adventurer',
    name: 'The test Guild',
    abilities: DEFAULT_ABILITIES,
  },
  room: {
    type: 'combat',
    description: '',
    difficulty: 11,
    entities: [],
    threats: [],
    situation: {},
  },
  map: {
    nodes: [{ id: 'n0', name: 'Start', themeTag: 'start', cleared: false }],
    currentNodeIndex: 0,
    finalBoss: { name: 'The Test Boss', defeated: false },
  },
  recentEvents: [],
  nextResolveAt: 0,
  voteThreshold: 20,
};

describe('withDeadline', () => {
  it('stamps the next deadline on an open turn', () => {
    const now = 1_000_000;
    expect(withDeadline(base, now).nextResolveAt).toBe(now + TURN_CADENCE_MS);
  });

  it('leaves a finished run untouched', () => {
    const dead: GameState = { ...base, phase: 'dead', nextResolveAt: 42 };
    expect(withDeadline(dead, 1_000_000).nextResolveAt).toBe(42);
  });
});

describe('turnStartedAt', () => {
  it('is one cadence before the deadline', () => {
    const state: GameState = { ...base, nextResolveAt: 5_000_000 };
    expect(turnStartedAt(state)).toBe(5_000_000 - TURN_CADENCE_MS);
  });
});

describe('isDue', () => {
  it('is true once the deadline has passed', () => {
    const state: GameState = { ...base, nextResolveAt: 1000 };
    expect(isDue(state, 999)).toBe(false);
    expect(isDue(state, 1000)).toBe(true);
    expect(isDue(state, 1001)).toBe(true);
  });
});