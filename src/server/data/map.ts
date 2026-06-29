import { context, redis } from '@devvit/web/server';
import type { MapState } from '../../shared/game';
import { coerceMap } from '../game/map';

// One campaign map per subreddit, keyed like the world-bible so the post webview
// and the scheduler (which runs without post context) resolve the same journey.
// This stores the fixed template (node names + boss); per-run progress lives in
// the game state.
const mapKey = (subredditName: string): string => `crawl:${subredditName}:map`;

export async function loadMap(): Promise<MapState | null> {
  const raw = await redis.get(mapKey(context.subredditName));
  if (!raw) return null;
  try {
    return coerceMap(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function saveMap(map: MapState): Promise<void> {
  await redis.set(mapKey(context.subredditName), JSON.stringify(map));
}

// Clears the sub's cached map so the next access regenerates a fresh journey.
export async function deleteMap(): Promise<void> {
  await redis.del(mapKey(context.subredditName));
}