import { context, redis } from '@devvit/web/server';
import type { GameState } from '../../shared/game';
import { deserializeGame, serializeGame } from './serialization';

// One active game per subreddit (the design's model), so a run is keyed by its
// host sub. This lets both the post webview and the scheduler — which runs with
// no post context — load the same game.
const gameKey = (subredditName: string): string =>
  `crawl:${subredditName}:state`;

export async function loadGame(): Promise<GameState | null> {
  const raw = await redis.get(gameKey(context.subredditName));
  return raw ? deserializeGame(raw) : null;
}

export async function saveGame(state: GameState): Promise<void> {
  await redis.set(gameKey(context.subredditName), serializeGame(state));
}

// Clears the sub's shared community run so a world reset starts from a fresh
// game rather than one still carrying the old map.
export async function deleteGame(): Promise<void> {
  await redis.del(gameKey(context.subredditName));
}

// A private, per-user solo run. Keyed by sub and user so every player has their
// own game, separate from the sub's one shared community run.
const soloKey = (subredditName: string, userId: string): string =>
  `crawl:${subredditName}:solo:${userId}:state`;

export async function loadSoloGame(userId: string): Promise<GameState | null> {
  const raw = await redis.get(soloKey(context.subredditName, userId));
  return raw ? deserializeGame(raw) : null;
}

export async function saveSoloGame(
  userId: string,
  state: GameState
): Promise<void> {
  await redis.set(soloKey(context.subredditName, userId), serializeGame(state));
}
