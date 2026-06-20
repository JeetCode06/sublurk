import { describe, it, expect } from 'vitest';
import { rankProposals } from '../src/server/game/voting';

describe('rankProposals', () => {
  it('orders proposals by score, highest first', () => {
    const ranked = rankProposals([
      { id: 'a', body: 'open the door', score: 3 },
      { id: 'b', body: 'flee', score: 9 },
      { id: 'c', body: 'wait', score: 1 },
    ]);
    expect(ranked.map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('the first entry is the winning action', () => {
    const ranked = rankProposals([
      { id: 'a', body: 'open the door', score: 3 },
      { id: 'b', body: 'flee', score: 9 },
    ]);
    expect(ranked[0]?.id).toBe('b');
  });

  it('drops recap comments, blanks, and deleted bodies', () => {
    const ranked = rankProposals([
      { id: 'recap', body: '🎲 The party chose: "x"', score: 99 },
      { id: 'blank', body: '   ', score: 50 },
      { id: 'gone', body: '[deleted]', score: 40 },
      { id: 'real', body: 'search the altar', score: 2 },
    ]);
    expect(ranked.map((p) => p.id)).toEqual(['real']);
  });

  it('keeps ties in their original order', () => {
    const ranked = rankProposals([
      { id: 'first', body: 'first', score: 5 },
      { id: 'second', body: 'second', score: 5 },
    ]);
    expect(ranked.map((p) => p.id)).toEqual(['first', 'second']);
  });

  it('caps the number of candidates', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `c${i}`,
      body: `action number ${i}`,
      score: i,
    }));
    expect(rankProposals(many).length).toBeLessThanOrEqual(8);
  });

  it('returns an empty list when nothing is playable', () => {
    expect(rankProposals([])).toEqual([]);
    expect(rankProposals([{ id: 'a', body: ' ', score: 1 }])).toEqual([]);
  });
});