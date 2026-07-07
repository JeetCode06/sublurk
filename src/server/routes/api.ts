import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  ClassNamesResponse,
  ContextResponse,
  ErrorResponse,
  GameResponse,
  LeaderboardResponse,
  ModRequestResponse,
  ProposalsResponse,
} from '../../shared/api';
import type { ClassId, GameState } from '../../shared/game';
import { loadGame, saveGame, loadSoloGame, saveSoloGame } from '../data/games';
import { recordRun, topRuns } from '../data/leaderboard';
import { loadLore, appendRun } from '../data/lore';
import { tauntFromLore, recordFromState } from '../game/lore';
import { createInitialState, startNewRun } from '../game/state';
import { CLASSES } from '../game/classes';
import { freshMap } from '../game/map';
import { classForSubreddit, themeForSubreddit } from '../game/theming';
import { runTurn, resolveTurnFromComments, readProposals } from '../turn';
import { postKind } from '../core/post';
import { withDeadline, turnStartedAt } from '../schedule';
import { withRoomIntro } from '../scene';
import { ensureWorldBible } from '../worldbible';
import { ensureMap } from '../worldmap';
import {
  normalizeSubredditName,
  evaluateModRequest,
  applyModRequest,
  buildModRequestMessage,
} from '../core/modrequest';
import {
  readModRequestRecord,
  writeModRequestRecord,
} from '../data/modrequest';

export const api = new Hono();

function errorMessage(error: unknown): string {
  console.error(error);
  return error instanceof Error ? error.message : 'Unexpected server error';
}

async function currentUsername(): Promise<string> {
  const username = await reddit.getCurrentUsername();
  return username ?? 'adventurer';
}

// The nemesis's remembered line for a new run, from past outcomes in this scope
// (the subreddit's shared history, or a solo player's own).
async function rememberedTaunt(userId?: string): Promise<string> {
  return tauntFromLore(await loadLore(userId));
}

// Records a run's outcome once it has ended, so the next descent can be taunted.
async function rememberOutcome(
  state: GameState,
  userId?: string
): Promise<void> {
  if (state.phase === 'dead' || state.phase === 'won') {
    await appendRun(recordFromState(state), userId);
  }
}

// The subreddit's themed name for each hero archetype, for the character screen.
api.get('/classes', async (c) => {
  try {
    const bible = await ensureWorldBible();
    return c.json<ClassNamesResponse>({
      type: 'classNames',
      names: bible.classNames,
    });
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});

// Tells the client whether this post is the shared community board or a private
// solo run, so the app routes to the right experience on open.
api.get('/context', async (c) => {
  return c.json<ContextResponse>({ type: 'context', kind: await postKind() });
});

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
    const bible = await ensureWorldBible();
    if (!state) {
      const map = await ensureMap(bible);
      state = withDeadline({
        ...createInitialState({
          postId,
          subredditName,
          classId: classForSubreddit(subredditName),
          theme: themeForSubreddit(subredditName),
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

    const bible = await ensureWorldBible();
    const nextState = withDeadline(
      await withRoomIntro((await runTurn(state, action, bible)).state, bible)
    );
    await saveGame(nextState);
    await rememberOutcome(nextState);

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

api.get('/solo/game', async (c) => {
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
      400
    );
  }
});

api.post('/solo/start', async (c) => {
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
      requested in CLASSES
        ? (requested as ClassId)
        : classForSubreddit(subredditName);

    const bible = await ensureWorldBible();
    const map = await ensureMap(bible);
    const state = await withRoomIntro(
      {
        ...createInitialState({
          postId,
          subredditName,
          classId,
          theme: themeForSubreddit(subredditName),
        }),
        map: freshMap(map),
        nemesisLine: await rememberedTaunt(userId),
      },
      bible,
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
      400
    );
  }
});

api.post('/solo/action', async (c) => {
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
    if (state.phase === 'dead') {
      return c.json<GameResponse>({
        type: 'game',
        state,
        username: await currentUsername(),
      });
    }

    const bible = await ensureWorldBible();
    const turn = await runTurn(state, action, bible, 'solo');
    const nextState = await withRoomIntro(turn.state, bible, 'solo');
    await saveSoloGame(userId, nextState);
    await rememberOutcome(nextState, userId);

    return c.json<GameResponse>({
      type: 'game',
      state: nextState,
      username: await currentUsername(),
      degraded: !turn.aiResponded,
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
      await rememberOutcome(outcome.state);
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
    const bible = await ensureWorldBible();
    const map = await ensureMap(bible);
    const base = existing
      ? startNewRun(existing)
      : createInitialState({
          postId,
          subredditName,
          classId: classForSubreddit(subredditName),
          theme: themeForSubreddit(subredditName),
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
      400
    );
  }
});

// Lets a non-moderator ask another community's mods to add the game. Spam is
// held off two ways: a community can only be asked once per user, and a user can
// only ask a few communities per day. Every request names the asking redditor.
api.post('/request-mod', async (c) => {
  try {
    const body = await c.req.json<{ subreddit?: unknown }>();
    const subreddit =
      typeof body.subreddit === 'string'
        ? normalizeSubredditName(body.subreddit)
        : null;
    if (subreddit === null) {
      return c.json<ModRequestResponse>(
        { type: 'modRequest', status: 'invalid' },
        400
      );
    }

    const userId = context.userId;
    const username = await reddit.getCurrentUsername();
    if (!userId || !username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'You must be logged in to make a request' },
        401
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const record = await readModRequestRecord(userId);
    const verdict = evaluateModRequest({ record, subreddit, today });
    if (verdict !== 'ok') {
      return c.json<ModRequestResponse>(
        { type: 'modRequest', status: verdict, subreddit },
        200
      );
    }

    const { subject, body: mailBody } = buildModRequestMessage({
      subreddit,
      username,
    });
    await reddit.modMail.createConversation({
      subredditName: subreddit,
      subject,
      body: mailBody,
      isAuthorHidden: false,
    });
    await writeModRequestRecord(
      userId,
      applyModRequest(record, subreddit, today)
    );

    return c.json<ModRequestResponse>(
      { type: 'modRequest', status: 'sent', subreddit },
      200
    );
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});