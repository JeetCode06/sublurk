import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  ErrorResponse,
  GameResponse,
  LeaderboardResponse,
  ProposalsResponse,
} from '../../shared/api';
import { loadGame, saveGame } from '../data/games';
import { recordRun, topRuns } from '../data/leaderboard';
import { createInitialState, startNewRun } from '../game/state';
import { classForSubreddit, themeForSubreddit } from '../game/theming';
import { runTurn, resolveTurnFromComments, readProposals } from '../turn';
import { withDeadline, turnStartedAt } from '../schedule';
import { withRoomIntro } from '../scene';

export const api = new Hono();

function errorMessage(error: unknown): string {
  console.error(error);
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
    let state = await loadGame();
    if (!state) {
      state = withDeadline(
        createInitialState({
          postId,
          subredditName,
          classId: classForSubreddit(subredditName),
          theme: themeForSubreddit(subredditName),
        })
      );
    }
    // Fill the room's intro if missing, without re-stamping the deadline, so
    // opening the webview never delays a turn.
    const described = await withRoomIntro(state);
    if (described !== state) {
      await saveGame(described);
    }
    return c.json<GameResponse>({
      type: 'game',
      state: described,
      username: await currentUsername(),
    });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      400
    );
  }
});

api.get('/proposals', async (c) => {
  try {
    const state = await loadGame();
    if (!state) {
      return c.json<ProposalsResponse>({
        type: 'proposals',
        proposals: [],
        serverNow: Date.now(),
        state: null,
      });
    }
    const proposals = await readProposals(state.postId, turnStartedAt(state));
    return c.json<ProposalsResponse>({
      type: 'proposals',
      proposals,
      serverNow: Date.now(),
      state,
    });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      400
    );
  }
});

api.get('/leaderboard', async (c) => {
  try {
    const entries = await topRuns(10);
    return c.json<LeaderboardResponse>({ type: 'leaderboard', entries });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      400
    );
  }
});

api.post('/action', async (c) => {
  try {
    const body = await c.req.json<{ action?: unknown }>();
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    if (action.length === 0) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'An action is required' },
        400
      );
    }

    const state = await loadGame();
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

    const nextState = withDeadline(
      await withRoomIntro(await runTurn(state, action))
    );
    await saveGame(nextState);

    if (nextState.party.depth > state.party.depth) {
      await recordRun(nextState);
    }

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

api.post('/resolve', async (c) => {
  try {
    const outcome = await resolveTurnFromComments();
    const username = await currentUsername();
    if (outcome.status === 'resolved') {
      return c.json<GameResponse>({
        type: 'game',
        state: outcome.state,
        username,
      });
    }
    const state = await loadGame();
    if (!state) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'No active game for this post' },
        404
      );
    }
    const notes: Record<'no_game' | 'dead' | 'no_proposals', string> = {
      no_game: 'No active game for this post.',
      dead: 'The party has fallen — start a new run.',
      no_proposals: 'No actions proposed yet. Comment one, then resolve.',
    };
    return c.json<GameResponse>({
      type: 'game',
      state,
      username,
      note: notes[outcome.status],
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
    const existing = await loadGame();
    const base = existing
      ? startNewRun(existing)
      : createInitialState({
          postId,
          subredditName,
          classId: classForSubreddit(subredditName),
          theme: themeForSubreddit(subredditName),
        });
    const state = withDeadline(await withRoomIntro(base));
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