import { describe, it, expect } from 'vitest';
import {
  DAILY_REQUEST_LIMIT,
  EMPTY_RECORD,
  normalizeSubredditName,
  evaluateModRequest,
  applyModRequest,
  buildModRequestMessage,
  type ModRequestRecord,
} from '../src/server/core/modrequest';

describe('normalizeSubredditName', () => {
  it('strips an r/ or /r/ prefix and surrounding whitespace', () => {
    expect(normalizeSubredditName('  r/AskReddit ')).toBe('AskReddit');
    expect(normalizeSubredditName('/r/pics')).toBe('pics');
    expect(normalizeSubredditName('gaming')).toBe('gaming');
  });

  it('accepts names with digits and underscores', () => {
    expect(normalizeSubredditName('r/Dungeons_and_Dragons')).toBe(
      'Dungeons_and_Dragons'
    );
    expect(normalizeSubredditName('rpg2')).toBe('rpg2');
  });

  it('rejects names that break subreddit rules', () => {
    expect(normalizeSubredditName('')).toBeNull();
    expect(normalizeSubredditName('ab')).toBeNull(); // too short
    expect(normalizeSubredditName('a'.repeat(22))).toBeNull(); // too long
    expect(normalizeSubredditName('_leading')).toBeNull(); // leading underscore
    expect(normalizeSubredditName('has space')).toBeNull();
    expect(normalizeSubredditName('u/someuser')).toBeNull(); // a user, not a sub
  });
});

describe('evaluateModRequest', () => {
  const today = '2026-06-30';

  it('allows a fresh request', () => {
    expect(
      evaluateModRequest({ record: EMPTY_RECORD, subreddit: 'pics', today })
    ).toBe('ok');
  });

  it('refuses a community the user already asked, case-insensitively', () => {
    const record: ModRequestRecord = {
      day: today,
      countToday: 1,
      subs: ['pics'],
    };
    expect(evaluateModRequest({ record, subreddit: 'PICS', today })).toBe(
      'already_requested'
    );
  });

  it('refuses once the daily limit is reached', () => {
    const record: ModRequestRecord = {
      day: today,
      countToday: DAILY_REQUEST_LIMIT,
      subs: ['a', 'b', 'c'],
    };
    expect(evaluateModRequest({ record, subreddit: 'new', today })).toBe(
      'daily_limit'
    );
  });

  it('resets the daily count on a new day', () => {
    const record: ModRequestRecord = {
      day: '2026-06-29',
      countToday: DAILY_REQUEST_LIMIT,
      subs: ['a', 'b', 'c'],
    };
    expect(evaluateModRequest({ record, subreddit: 'new', today })).toBe('ok');
  });
});

describe('applyModRequest', () => {
  const today = '2026-06-30';

  it('records the community lowercased and bumps the daily count', () => {
    const next = applyModRequest(
      { day: today, countToday: 1, subs: ['pics'] },
      'AskReddit',
      today
    );
    expect(next.countToday).toBe(2);
    expect(next.subs).toEqual(['pics', 'askreddit']);
    expect(next.day).toBe(today);
  });

  it('rolls the count over to a new day', () => {
    const next = applyModRequest(
      { day: '2026-06-29', countToday: 3, subs: ['a'] },
      'gaming',
      today
    );
    expect(next.countToday).toBe(1);
    expect(next.day).toBe(today);
    expect(next.subs).toEqual(['a', 'gaming']);
  });
});

describe('buildModRequestMessage', () => {
  it('names the community, the asking user, and the install link', () => {
    const { subject, body } = buildModRequestMessage({
      subreddit: 'CozyGames',
      username: 'satrajit',
      installUrl: 'https://example.com/app',
    });
    expect(subject).toContain('CozyGames');
    expect(body).toContain('u/satrajit');
    expect(body).toContain('r/CozyGames');
    expect(body).toContain('https://example.com/app');
  });
});