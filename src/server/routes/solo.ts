import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type { ErrorResponse, GameResponse, SoloLeaderboardResponse } from '../../shared/api';
import type { ClassId } from '../../shared/game';
import { loadSoloGame, saveSoloGame } from '../data/games';
import { recordSoloBest, topSoloRuns } from '../data/leaderboard';
import { createInitialState } from '../game/state';
import { CLASSES } from '../game/classes';
import { freshMap } from '../game/map';
import { runTurn } from '../turn';
import { withRoomIntro } from '../scene';
import { SOLO_WORLD_BIBLE, SOLO_MAP } from '../soloworld';
import {
  currentUsername,
  errorMessage,
  rememberedTaunt,
  rememberOutcome,
} from './helpers';

export const solo = new Hono();

solo.get('/leaderboard', async (c) => {
  try {
    return c.json<SoloLeaderboardResponse>({
      type: 'solo_leaderboard',
      entries: await topSoloRuns(10),
    });
  } catch {
    return c.json<SoloLeaderboardResponse>({
      type: 'solo_leaderboard',
      entries: [],
    });
  }
});

solo.get('/game', async (c) => {
  const { userId } = context;
  if (!userId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Sign in to play a solo run' },
      401
    );
  }
  try {
    const state = await loadSoloGame(userId);
    if (!state) {
      // No run to resume; the client shows character select instead.
      return c.json({ type: 'none' } as const);
    }
    return c.json<GameResponse>({
      type: 'game',
      state,
      username: await currentUsername(),
    });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});

solo.post('/start', async (c) => {
  const { postId, subredditName, userId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is missing from context' },
      400
    );
  }
  if (!userId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Sign in to play a solo run' },
      401
    );
  }
  try {
    const body = await c.req.json<{ classId?: unknown }>();
    const requested = typeof body.classId === 'string' ? body.classId : '';
    const classId: ClassId =
      requested in CLASSES ? (requested as ClassId) : 'adventurer';

    const state = await withRoomIntro(
      {
        ...createInitialState({ postId, subredditName, classId }),
        map: freshMap(SOLO_MAP),
        nemesisLine: await rememberedTaunt(userId),
      },
      SOLO_WORLD_BIBLE,
      'solo'
    );
    await saveSoloGame(userId, state);

    return c.json<GameResponse>({
      type: 'game',
      state,
      username: await currentUsername(),
    });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});

solo.post('/action', async (c) => {
  const { userId } = context;
  if (!userId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Sign in to play a solo run' },
      401
    );
  }
  try {
    const body = await c.req.json<{ action?: unknown }>();
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    if (action.length === 0) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'An action is required' },
        400
      );
    }

    const state = await loadSoloGame(userId);
    if (!state) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'No active solo run' },
        404
      );
    }
    if (state.phase !== 'awaiting_actions') {
      return c.json<GameResponse>({
        type: 'game',
        state,
        username: await currentUsername(),
      });
    }

    const turn = await runTurn(state, action, SOLO_WORLD_BIBLE, 'solo');
    // A wash turn changed nothing, so there is nothing to save or record —
    // the client shows the cooldown and the player retries.
    if (!turn.aiResponded) {
      return c.json<GameResponse>({
        type: 'game',
        state,
        username: await currentUsername(),
        degraded: true,
      });
    }

    const nextState = await withRoomIntro(turn.state, SOLO_WORLD_BIBLE, 'solo');
    await saveSoloGame(userId, nextState);
    await rememberOutcome(nextState, userId);

    // A finished run takes its place on the board, but only if it beat this
    // player's own best — and only under a real username, so anonymous runs
    // don't pile onto one shared row.
    if (nextState.phase === 'dead' || nextState.phase === 'won') {
      const username = await reddit.getCurrentUsername();
      if (username) {
        await recordSoloBest(
          username,
          nextState.party.depth,
          nextState.rolls ?? 0,
          nextState.party.classId,
          nextState.phase === 'won'
        );
      }
    }

    return c.json<GameResponse>({
      type: 'game',
      state: nextState,
      username: await currentUsername(),
    });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});