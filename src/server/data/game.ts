import { redis } from '@devvit/web/server';
import type { GameState } from '../../shared/game';
import { deserializeGame, serializeGame } from './serialization';

const gameKey = (postId: string): string => `game:${postId}`;

export async function loadGame(postId: string): Promise<GameState | null> {
  const raw = await redis.get(gameKey(postId));
  return raw ? deserializeGame(raw) : null;
}

export async function saveGame(state: GameState): Promise<void> {
  await redis.set(gameKey(state.postId), serializeGame(state));
}