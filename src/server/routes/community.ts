import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type {
  ErrorResponse,
  GameResponse,
  LeaderboardResponse,
  ProposalsResponse,
} from '../../shared/api';
import { loadGame, saveGame } from '../data/games';
import { topRuns } from '../data/leaderboard';
import { createInitialState, startNewRun } from '../game/state';
import { freshMap } from '../game/map';
import { classForSubreddit } from '../game/theming';
import { resolveTurnFromComments, readProposals } from '../turn';
import { withDeadline, turnStartedAt } from '../schedule';
import { withRoomIntro } from '../scene';
import { ensureWorldBible } from '../worldbible';
import { ensureMap } from '../worldmap';
import {
  currentUsername,
  errorMessage,
  isCurrentUserMod,
  rememberedTaunt,
} from './helpers';

export const community = new Hono();

community.get('/game', async (c) => {
  const { postId, subredditName } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is missing from context' },
      400
    );
  }
  try {
    let state = await loadGame();
    const bible = await ensureWorldBible();
    if (!state) {
      const map = await ensureMap(bible);
      state = withDeadline({
        ...createInitialState({
          postId,
          subredditName,
          classId: classForSubreddit(subredditName),
        }),
        map: freshMap(map),
        nemesisLine: await rememberedTaunt(),
      });
    }
    // Fill the room's intro if missing, without re-stamping the deadline, so
    // opening the webview never delays a turn. The world and map are ensured
    // here too, generating them on the first open of a sub's game.
    const described = await withRoomIntro(state, bible);
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
      500
    );
  }
});

community.get('/proposals', async (c) => {
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
      500
    );
  }
});

community.get('/leaderboard', async (c) => {
  try {
    const entries = await topRuns(10);
    return c.json<LeaderboardResponse>({ type: 'leaderboard', entries });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});

// Resolving early and restarting steer the whole sub's shared run, so both are
// enforced server-side — the client hiding the buttons is not a boundary.
community.post('/resolve', async (c) => {
  try {
    if (!(await isCurrentUserMod())) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Only a moderator can resolve the turn' },
        403
      );
    }
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
    const notes: Record<Exclude<typeof outcome.status, 'resolved'>, string> = {
      no_game: 'No active game for this post.',
      dead: 'The party has fallen — start a new run.',
      won: 'The campaign is already won — start a new run.',
      no_proposals: 'No actions proposed yet. Comment one, then resolve.',
      ai_unavailable: 'The Warden is silent right now. Try again shortly.',
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
      500
    );
  }
});

community.post('/restart', async (c) => {
  const { postId, subredditName } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is missing from context' },
      400
    );
  }
  try {
    if (!(await isCurrentUserMod())) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Only a moderator can start a new run' },
        403
      );
    }
    const existing = await loadGame();
    const bible = await ensureWorldBible();
    const map = await ensureMap(bible);
    const base = existing
      ? startNewRun(existing)
      : createInitialState({
          postId,
          subredditName,
          classId: classForSubreddit(subredditName),
        });
    // A new run always begins on the subreddit's canonical campaign map, so a
    // restart also adopts a map that was generated since the run started.
    const state = withDeadline(
      await withRoomIntro(
        { ...base, map: freshMap(map), nemesisLine: await rememberedTaunt() },
        bible
      )
    );
    await saveGame(state);
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
