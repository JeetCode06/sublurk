import { context, reddit } from '@devvit/web/server';
import type { GameState, Proposal } from '../shared/game';
import { prepareRoll, applyTurn } from './game/resolution';
import { rankProposals, RECAP_MARKER } from './game/voting';
import { SYSTEM_PROMPT, buildTurnPrompt } from './ai/prompt';
import { parseResolveResult } from './ai/parse';
import { callGemini } from './ai/gemini';
import { loadGame, saveGame } from './data/games';

// Runs one turn through the full pipeline: roll, narrate, validate, apply.
// Does not persist — the caller decides when to save.
export async function runTurn(
  state: GameState,
  action: string
): Promise<GameState> {
  const roll = prepareRoll(state);
  const raw = await callGemini(
    SYSTEM_PROMPT,
    buildTurnPrompt(state, action, roll)
  );
  return applyTurn(state, parseResolveResult(raw));
}

// Reads the post's comments and ranks them into the current candidate actions.
// The panel shows this list; its first entry is the action that resolves.
export async function readProposals(): Promise<Proposal[]> {
  const { postId } = context;
  if (!postId) return [];
  const comments = await reddit
    .getComments({ postId, sort: 'top', limit: 100 })
    .all();
  return rankProposals(
    comments.map((comment) => ({
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
  const { postId } = context;
  if (!postId) return { status: 'no_game' };

  const state = await loadGame(postId);
  if (!state) return { status: 'no_game' };
  if (state.phase === 'dead') return { status: 'dead' };

  const proposals = await readProposals();
  const winner = proposals[0] ?? null;
  if (!winner) return { status: 'no_proposals' };

  const nextState = await runTurn(state, winner.body);
  await saveGame(nextState);

  // Best-effort recap: a failure to post must not fail the resolved turn.
  const latest =
    nextState.recentEvents[nextState.recentEvents.length - 1] ?? '';
  try {
    await reddit.submitComment({
      id: postId,
      text: `${RECAP_MARKER} The party chose: "${winner.body}"\n\n${latest}`,
    });
  } catch (error) {
    console.error(`Failed to post recap comment: ${error}`);
  }

  return { status: 'resolved', state: nextState, action: winner.body };
}