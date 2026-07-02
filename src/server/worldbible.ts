import { context, reddit } from '@devvit/web/server';
import type { WorldBible } from '../shared/game';
import {
  WORLD_BIBLE_SYSTEM_PROMPT,
  buildWorldBiblePrompt,
  type SubredditContext,
} from './ai/prompt';
import { parseWorldBible } from './ai/parse';
import { callGemini, WORLD_GEN_TIMEOUT_MS } from './ai/gemini';
import { loadBible, saveBible } from './data/bible';

// Top posts sampled to seed the world: enough to convey a subreddit's character
// without bloating the generation prompt.
const MAX_SEED_TITLES = 12;

// Generates a subreddit's one-time campaign world from its own name, description,
// and top posts. Any AI failure (missing key, network error, blocked or
// unparseable reply) degrades to the default world inside parseWorldBible, so a
// campaign can always start.
export async function generateWorldBible(
  seed: SubredditContext
): Promise<WorldBible> {
  const raw = await callGemini(
    WORLD_BIBLE_SYSTEM_PROMPT,
    buildWorldBiblePrompt(seed),
    WORLD_GEN_TIMEOUT_MS
  );
  return parseWorldBible(raw);
}

// Reads the host subreddit's own name, description, and a sample of its top post
// titles — the raw material a world is generated from. Works in scheduler
// context too, since every lookup is by subreddit name rather than post.
export async function readSubredditContext(): Promise<SubredditContext> {
  const subredditName = context.subredditName;
  const info = await reddit.getSubredditInfoByName(subredditName);
  const posts = await reddit
    .getTopPosts({ subredditName, timeframe: 'all', limit: MAX_SEED_TITLES })
    .all();
  const topPostTitles = posts
    .map((post) => post.title.trim())
    .filter((title) => title.length > 0);
  return {
    name: info.name ?? subredditName,
    description: info.description?.markdown ?? '',
    topPostTitles,
  };
}

// Returns the subreddit's campaign world, generating and storing it once on
// first use and reusing it thereafter, so building a world costs an AI call only
// once per subreddit rather than once per run.
export async function ensureWorldBible(): Promise<WorldBible> {
  const existing = await loadBible();
  if (existing) return existing;
  const seed = await readSubredditContext();
  const bible = await generateWorldBible(seed);
  await saveBible(bible);
  return bible;
}