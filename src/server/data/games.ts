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