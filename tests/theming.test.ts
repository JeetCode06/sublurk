import { describe, it, expect } from 'vitest';
import {
  classForSubreddit,
  themeForSubreddit,
} from '../src/server/game/theming';

describe('classForSubreddit', () => {
  it('is deterministic for the same subreddit', () => {
    expect(classForSubreddit('gardening')).toBe(classForSubreddit('gardening'));
  });

  it('returns a valid class id', () => {
    const valid = ['warrior', 'witch', 'healer', 'trickster', 'adventurer'];
    expect(valid).toContain(classForSubreddit('anything'));
  });

  it('can produce different classes for different subreddits', () => {
    const classes = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(classForSubreddit)
    );
    expect(classes.size).toBeGreaterThan(1);
  });
});

describe('themeForSubreddit', () => {
  it('includes the subreddit name', () => {
    expect(themeForSubreddit('witchcraft')).toContain('witchcraft');
  });
});
