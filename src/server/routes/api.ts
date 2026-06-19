import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type { ErrorResponse, GameResponse } from '../../shared/api';
import { loadGame, saveGame } from '../data/games';
import { createInitialState, startNewRun } from '../game/state';
import { prepareRoll, applyTurn } from '../game/resolution';
import { classForSubreddit, themeForSubreddit } from '../game/theming';
import { SYSTEM_PROMPT, buildTurnPrompt } from '../ai/prompt';
import { parseResolveResult } from '../ai/parse';
import { callGemini } from '../ai/gemini';

export const api = new Hono();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected server error';
}

async function currentUsername(): Promise<string> {
  const username = await reddit.getCurrentUsername();
  return username ?? 'adventurer';
}

api.get('/game', async (c) => {
  const { postId, subredditName } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is missing from context' },
      400
    );
  }
  try {
    let state = await loadGame(postId);
    if (!state) {
      state = createInitialState({
        postId,
        subredditName,
        classId: classForSubreddit(subredditName),
        theme: themeForSubreddit(subredditName),
      });
      await saveGame(state);
    }
    return c.json<GameResponse>({
      type: 'game',
      state,
      username: await currentUsername(),
    });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      400
    );
  }
});

api.post('/action', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is missing from context' },
      400
    );
  }
  try {
    const body = (await c.req.json()) as { action?: unknown };
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    if (action.length === 0) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'An action is required' },
        400
      );
    }

    const state = await loadGame(postId);
    if (!state) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'No active game for this post' },
        404
      );
    }
    if (state.phase === 'dead') {
      return c.json<GameResponse>({
        type: 'game',
        state,
        username: await currentUsername(),
      });
    }

    const roll = prepareRoll(state);
    const raw = await callGemini(
      SYSTEM_PROMPT,
      buildTurnPrompt(state, action, roll)
    );
    const nextState = applyTurn(state, parseResolveResult(raw));
    await saveGame(nextState);

    return c.json<GameResponse>({
      type: 'game',
      state: nextState,
      username: await currentUsername(),
    });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      400
    );
  }
});

api.post('/restart', async (c) => {
  const { postId, subredditName } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is missing from context' },
      400
    );
  }
  try {
    const existing = await loadGame(postId);
    const state = existing
      ? startNewRun(existing)
      : createInitialState({
          postId,
          subredditName,
          classId: classForSubreddit(subredditName),
          theme: themeForSubreddit(subredditName),
        });
    await saveGame(state);
    return c.json<GameResponse>({
      type: 'game',
      state,
      username: await currentUsername(),
    });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      400
    );
  }
});
