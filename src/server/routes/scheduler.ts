import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import { loadGame } from '../data/games';
import { isDue } from '../schedule';
import { resolveTurnFromComments } from '../turn';

export const scheduler = new Hono();

// Fires on a cron (declared in devvit.json). The cadence is enforced by each
// turn's nextResolveAt, not the cron interval: a tick only resolves once the
// deadline has passed. Runs in subreddit context with no postId, which is why
// the game is loaded by subreddit rather than from context.
scheduler.post('/resolve-turn', async (c) => {
  try {
    const state = await loadGame();
    if (state?.phase === 'awaiting_actions' && isDue(state)) {
      await resolveTurnFromComments();
    }
  } catch (error) {
    console.error(`Scheduled resolve failed: ${error}`);
  }
  return c.json<TaskResponse>({});
});
