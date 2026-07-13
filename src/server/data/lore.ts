import { context, redis } from '@devvit/web/server';
import { EMPTY_LORE, type Lore, type RunRecord } from '../game/lore';

const MAX_RUNS = 12;

// Community lore is shared per subreddit; solo lore is private per user. Both
// survive a restart, so a nemesis remembers across runs. The `lore:` prefix
// (rather than `crawl:`) is legacy — changing it would orphan live records.
function loreKey(userId?: string): string {
  const sub = context.subredditName;
  return userId ? `lore:${sub}:${userId}` : `lore:${sub}`;
}

export async function loadLore(userId?: string): Promise<Lore> {
  const raw = await redis.get(loreKey(userId));
  if (!raw) return EMPTY_LORE;
  try {
    const parsed = JSON.parse(raw) as Partial<Lore>;
    return Array.isArray(parsed.runs) ? { runs: parsed.runs } : EMPTY_LORE;
  } catch {
    return EMPTY_LORE;
  }
}

// Appends a run's outcome, keeping only the most recent runs. Recording is
// idempotent per run number, so a replayed terminal turn is not double-counted.
export async function appendRun(
  record: RunRecord,
  userId?: string
): Promise<Lore> {
  const lore = await loadLore(userId);
  const last = lore.runs.at(-1);
  if (last && last.runNumber === record.runNumber) {
    return lore;
  }
  const next: Lore = { runs: [...lore.runs, record].slice(-MAX_RUNS) };
  await redis.set(loreKey(userId), JSON.stringify(next));
  return next;
}
