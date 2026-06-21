import { reddit } from '@devvit/web/server';
import type { GameState, Proposal, WorldBible } from '../shared/game';
import { prepareRoll, applyTurn } from './game/resolution';
import { rankProposals, RECAP_MARKER } from './game/voting';
import { SYSTEM_PROMPT, buildTurnPrompt } from './ai/prompt';
import { parseResolveResult } from './ai/parse';
import { callGemini } from './ai/gemini';
import { loadGame, saveGame } from './data/games';
import { withDeadline, turnStartedAt } from './schedule';
import { withRoomIntro } from './scene';
import { recordRun } from './data/leaderboard';
import { ensureWorldBible } from './worldbible';

// A Reddit post fullname (t3_...). GameState stores postId as a plain string
// to keep the shared contract free of Devvit types, so we re-tag it here at
// the Reddit API boundary.
type PostId = `t3_${string}`;

// Runs one turn through the full pipeline: roll, narrate, validate, apply.
// Does not persist — the caller decides when to save.
export async function runTurn(
  state: GameState,
  action: string,
  bible: WorldBible
): Promise<GameState> {
  const roll = prepareRoll(state);
  const raw = await callGemini(
    SYSTEM_PROMPT,
    buildTurnPrompt(state, action, roll, bible)
  );
  return { ...applyTurn(state, parseResolveResult(raw)), lastCheck: roll };
}

// Reads the post's comments and ranks them into the current candidate actions.
// Only comments posted since the turn opened count, so old comments don't win
// every turn. The first entry is the action that resolves.
export async function readProposals(
  postId: string,
  since: number
): Promise<Proposal[]> {
  const comments = await reddit
    .getComments({ postId: postId as PostId, sort: 'top', limit: 100 })
    .all();
  return rankProposals(
    comments
      .filter((comment) => comment.createdAt.getTime() >= since)
      .map((comment) => ({
        id: comment.id,
        body: comment.body,
        score: comment.score,
      }))
  );
}

export type ResolveOutcome =
  | { status: 'resolved'; state: GameState; action: string }
  | { status: 'no_game' }
  | { status: 'dead' }
  | { status: 'no_proposals' };

// Resolves the current turn from the post's comments: the top-voted comment
// becomes the party's action. Posts the dungeon master's recap and persists.
export async function resolveTurnFromComments(): Promise<ResolveOutcome> {
  const state = await loadGame();
  if (!state) return { status: 'no_game' };
  if (state.phase === 'dead') return { status: 'dead' };

  const proposals = await readProposals(state.postId, turnStartedAt(state));
  const winner = proposals[0] ?? null;
  if (!winner) return { status: 'no_proposals' };

  const bible = await ensureWorldBible();
  const nextState = withDeadline(
    await withRoomIntro(await runTurn(state, winner.body, bible), bible)
  );
  await saveGame(nextState);

  if (nextState.party.depth > state.party.depth) {
    await recordRun(nextState);
  }

  // Best-effort recap: a failure to post must not fail the resolved turn.
  const latest = nextState.recentEvents.at(-1) ?? '';
  try {
    await reddit.submitComment({
      id: state.postId as PostId,
      text: `${RECAP_MARKER} The party chose: "${winner.body}"\n\n${latest}`,
    });
  } catch (error) {
    console.error(`Failed to post recap comment: ${error}`);
  }

  return { status: 'resolved', state: nextState, action: winner.body };
}