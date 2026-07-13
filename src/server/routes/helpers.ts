import { context, reddit, redis } from '@devvit/web/server';
import type { GameState } from '../../shared/game';
import { loadLore, appendRun } from '../data/lore';
import { tauntFromLore, recordFromState } from '../game/lore';

export function errorMessage(error: unknown): string {
  // Log the real failure server-side, but never leak internals to the client.
  console.error(error);
  return 'Unexpected server error';
}

export async function currentUsername(): Promise<string> {
  const username = await reddit.getCurrentUsername();
  return username ?? 'adventurer';
}

// The moderator list is stable minute to minute, so the verdict is cached
// briefly per user instead of pulling the whole list on every context call.
const MOD_CACHE_SECONDS = 300;

const modCacheKey = (subredditName: string, userId: string): string =>
  `crawl:${subredditName}:mod:${userId}`;

// Whether the calling user moderates this subreddit. Used to gate board-only
// controls (resolving a turn, starting a new run) to mods. Any failure is
// treated as "not a mod" so the safe default is the least privilege.
export async function isCurrentUserMod(): Promise<boolean> {
  const { subredditName, userId } = context;
  if (!subredditName || !userId) return false;
  const key = modCacheKey(subredditName, userId);
  try {
    const cached = await redis.get(key);
    if (cached === '1') return true;
    if (cached === '0') return false;
  } catch {
    // A cache miss just means doing the real lookup.
  }
  try {
    const mods = await reddit.getModerators({ subredditName }).all();
    const isMod = mods.some((mod) => mod.id === userId);
    await redis.set(key, isMod ? '1' : '0');
    await redis.expire(key, MOD_CACHE_SECONDS);
    return isMod;
  } catch {
    return false;
  }
}

// The nemesis's remembered line for a new run, from past outcomes in this scope
// (the subreddit's shared history, or a solo player's own).
export async function rememberedTaunt(userId?: string): Promise<string> {
  return tauntFromLore(await loadLore(userId));
}

// Records a run's outcome once it has ended, so the next descent can be
// taunted. The community lane records inside resolveTurnFromComments; this is
// for the solo lane, whose lore is private per player.
export async function rememberOutcome(
  state: GameState,
  userId?: string
): Promise<void> {
  if (state.phase === 'dead' || state.phase === 'won') {
    await appendRun(recordFromState(state), userId);
  }
}
