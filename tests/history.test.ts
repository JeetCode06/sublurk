import { describe, it, expect } from 'vitest';
import {
  encodeSoloScore,
  decodeSoloScore,
} from '../src/server/data/leaderboard';
import { appendHistory, HISTORY_LIMIT } from '../src/server/game/history';
import type { GameState, HistoryEntry } from '../src/shared/game';

describe('solo leaderboard ranking', () => {
  it('ranks deeper runs above shallower ones', () => {
    expect(encodeSoloScore(5, 900)).toBeGreaterThan(encodeSoloScore(4, 1));
  });

  it('breaks a depth tie in favour of fewer rolls', () => {
    expect(encodeSoloScore(5, 12)).toBeGreaterThan(encodeSoloScore(5, 40));
  });

  it('round-trips depth and rolls', () => {
    expect(decodeSoloScore(encodeSoloScore(7, 33))).toEqual({
      depth: 7,
      rolls: 33,
    });
  });

  it('handles a zero-depth run', () => {
    expect(decodeSoloScore(encodeSoloScore(0, 3))).toEqual({
      depth: 0,
      rolls: 3,
    });
  });
});

describe('run history', () => {
  const base = { history: [] } as unknown as GameState;
  const beat = (text: string): HistoryEntry => ({ kind: 'scene', text });

  it('appends beats in order', () => {
    const next = appendHistory(base, [beat('one'), beat('two')]);
    expect(next.history?.map((h) => h.text)).toEqual(['one', 'two']);
  });

  it('returns the state unchanged when there is nothing to add', () => {
    expect(appendHistory(base, [])).toBe(base);
  });

  it('trims the oldest beats past the cap', () => {
    const many = Array.from({ length: HISTORY_LIMIT + 10 }, (_, i) =>
      beat(`beat ${i}`)
    );
    const next = appendHistory(base, many);
    expect(next.history).toHaveLength(HISTORY_LIMIT);
    expect(next.history?.[0]?.text).toBe('beat 10');
  });
});