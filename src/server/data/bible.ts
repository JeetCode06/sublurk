import { context, redis } from '@devvit/web/server';
import type { WorldBible } from '../../shared/game';
import { coerceWorldBible } from '../game/bible';

// One campaign world per subreddit, keyed like the game state so the post
// webview and the scheduler (which runs without post context) resolve the same
// world.
const bibleKey = (subredditName: string): string =>
  `crawl:${subredditName}:bible`;

// Returns the stored world, or null if none exists yet (the signal to generate
// one). A stored value is run back through coerceWorldBible so an older or
// partial record is repaired on read; unparseable data is treated as "no world".
export async function loadBible(): Promise<WorldBible | null> {
  const raw = await redis.get(bibleKey(context.subredditName));
  if (!raw) return null;
  try {
    return coerceWorldBible(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function saveBible(bible: WorldBible): Promise<void> {
  await redis.set(bibleKey(context.subredditName), JSON.stringify(bible));
}

// Clears the sub's cached world so the next access regenerates a fresh one.
export async function deleteBible(): Promise<void> {
  await redis.del(bibleKey(context.subredditName));
}