import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';
import { resolveTurnFromComments, type ResolveOutcome } from '../turn';

export const menu = new Hono();

function resolveToast(outcome: ResolveOutcome): string {
  switch (outcome.status) {
    case 'resolved':
      return 'The dungeon master has spoken — see the new comment.';
    case 'no_game':
      return 'No active game on this post yet.';
    case 'dead':
      return 'The party has fallen. Start a new run first.';
    case 'no_proposals':
      return 'No actions proposed yet — comment one, then resolve.';
  }
}

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/resolve-turn', async (c) => {
  try {
    const outcome = await resolveTurnFromComments();
    return c.json<UiResponse>({ showToast: resolveToast(outcome) }, 200);
  } catch (error) {
    console.error(`Error resolving turn: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to resolve the turn' }, 400);
  }
});