import { describe, it, expect } from 'vitest';
import {
  serializeGame,
  deserializeGame,
} from '../src/server/data/serialization';
import { createInitialState } from '../src/server/game/state';

const sample = createInitialState({
  postId: 't3_abc',
  subredditName: 'r/witchcraft',
  classId: 'witch',
  theme: 'mossy catacombs',
});

describe('serialization', () => {
  it('round-trips a game state without loss', () => {
    expect(deserializeGame(serializeGame(sample))).toEqual(sample);
  });

  it('returns null for invalid JSON', () => {
    expect(deserializeGame('not json {')).toBeNull();
  });

  it('returns null for JSON that is not a game state', () => {
    expect(deserializeGame('{"hello":"world"}')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(deserializeGame('')).toBeNull();
  });

  it('backfills the map on a saved game that predates it', () => {
    const noMap = JSON.parse(serializeGame(sample)) as Record<string, unknown>;
    delete noMap.map;
    const restored = deserializeGame(JSON.stringify(noMap));
    expect(restored?.map.nodes.length).toBeGreaterThanOrEqual(2);
    expect(restored?.map.currentNodeIndex).toBe(0);
  });
});