import { INSTALL_URL } from '../../shared/api';

// A non-mod can ask the moderators of another community to add the game. To keep
// this from becoming a spam vector, each user may only ask a given community
// once, and only a few communities per day. The request is always attributed to
// the asking redditor so mods know it came from one of their own members.
export const DAILY_REQUEST_LIMIT = 3;

// A user's request history: the day their daily count applies to, how many
// communities they've asked today, and the communities they've ever asked
// (lowercased) so we never message the same mod team twice.
export type ModRequestRecord = {
  day: string;
  countToday: number;
  subs: string[];
};

export const EMPTY_RECORD: ModRequestRecord = {
  day: '',
  countToday: 0,
  subs: [],
};

export type ModRequestVerdict = 'ok' | 'already_requested' | 'daily_limit';

// Strips an r/ or /r/ prefix and surrounding whitespace, then validates against
// Reddit's subreddit-name rules (3-21 chars, must start alphanumeric, only
// letters, numbers, and underscores). Returns the cleaned name, or null if the
// input can't be a real subreddit.
export function normalizeSubredditName(input: string): string | null {
  const trimmed = input.trim().replace(/^\/?r\//i, '');
  return /^[A-Za-z0-9][A-Za-z0-9_]{2,20}$/.test(trimmed) ? trimmed : null;
}

// Decides whether a fresh request is allowed given the user's history and the
// current day. A new day resets the daily count; asking a community already in
// the history is refused regardless of the count.
export function evaluateModRequest(params: {
  record: ModRequestRecord;
  subreddit: string;
  today: string;
  limit?: number;
}): ModRequestVerdict {
  const { record, subreddit, today, limit = DAILY_REQUEST_LIMIT } = params;
  if (record.subs.includes(subreddit.toLowerCase())) {
    return 'already_requested';
  }
  const countToday = record.day === today ? record.countToday : 0;
  return countToday >= limit ? 'daily_limit' : 'ok';
}

// Folds an allowed request into the history: rolls the daily count over when the
// day changes, then records the newly asked community.
export function applyModRequest(
  record: ModRequestRecord,
  subreddit: string,
  today: string
): ModRequestRecord {
  const countToday = record.day === today ? record.countToday : 0;
  return {
    day: today,
    countToday: countToday + 1,
    subs: [...record.subs, subreddit.toLowerCase()],
  };
}

// Composes the modmail sent to the target community's moderators. It names the
// asking redditor, explains the game in a line, points to the install page, and
// makes clear no reply is expected — a courteous, one-time nudge.
export function buildModRequestMessage(params: {
  subreddit: string;
  username: string;
  installUrl?: string;
}): { subject: string; body: string } {
  const { subreddit, username, installUrl = INSTALL_URL } = params;
  const subject = `A member suggested adding Sublurk to r/${subreddit}`;
  const body = [
    `Hi r/${subreddit} mods,`,
    '',
    `u/${username}, a member of your community, plays **Sublurk** — a co-op dungeon crawler where the whole subreddit votes on one party's next move and an AI dungeon master narrates what happens — and thought it would be a good fit here.`,
    '',
    `If you'd like to try it, you can add it from the Reddit Apps directory: ${installUrl}`,
    '',
    `This was sent on their behalf, just once for your community. No reply is needed if it isn't for you.`,
  ].join('\n');
  return { subject, body };
}
