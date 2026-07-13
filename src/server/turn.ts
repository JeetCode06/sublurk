import { reddit } from '@devvit/web/server';
import type {
  AbilityCheck,
  GameState,
  Proposal,
  WorldBible,
} from '../shared/game';
import { rollTurn, applyTurn } from './game/resolution';
import { appendHistory } from './game/history';
import { resolveCombat, combatDirective, combatEffects } from './game/combat';
import { resolveRest, restDirective, restEffects } from './game/healing';
import { resolveShrine, shrineDirective, shrineEffects } from './game/shrine';
import type { TurnEffects } from './game/effects';
import { rankProposals, RECAP_MARKER } from './game/voting';
import { turnSystemPrompt, buildTurnPrompt, type Lane } from './ai/prompt';
import { parseResolveResult } from './ai/parse';
import { callGemini } from './ai/gemini';
import { loadGame, saveGame } from './data/games';
import { withDeadline, turnStartedAt } from './schedule';
import { withRoomIntro } from './scene';
import { recordRun } from './data/leaderboard';
import { appendRun } from './data/lore';
import { recordFromState } from './game/lore';
import { ensureWorldBible } from './worldbible';

// A Reddit post fullname (t3_...). GameState stores postId as a plain string
// to keep the shared contract free of Devvit types, so we re-tag it here at
// the Reddit API boundary.
type PostId = `t3_${string}`;

// Player-authored text is injected into the narration prompt, so it is capped:
// long pastes bloat every turn's tokens, and a wall of text is the usual
// carrier for prompt-injection attempts. Plenty for any real action.
const MAX_ACTION_LENGTH = 300;

// A turn spent in a combat, rest, or shrine (shop) room resolves server-side
// before the AI is called. This packages that into the narration directive the
// model must follow and the state adjustments applyTurn applies; ordinary rooms,
// and a shrine the party doesn't engage, produce neither.
function resolveTurnEffects(
  state: GameState,
  roll: AbilityCheck,
  action: string
): { directive: string | null; effects: TurnEffects | null } {
  const combat = resolveCombat(state, roll);
  if (combat) {
    return {
      directive: combatDirective(combat),
      effects: combatEffects(combat),
    };
  }
  const rest = resolveRest(state, roll);
  if (rest) {
    return { directive: restDirective(rest), effects: restEffects(rest) };
  }
  const shrine = resolveShrine(state, action);
  if (shrine) {
    return {
      directive: shrineDirective(shrine),
      effects: shrineEffects(shrine),
    };
  }
  return { directive: null, effects: null };
}

// Runs one turn through the full pipeline: roll, narrate, validate, apply.
// Does not persist — the caller decides when to save. When the narrator is
// unreachable the turn is a true wash: the input state is returned untouched
// (no damage, no spent signatures, no roll), so the player can simply retry.
export async function runTurn(
  state: GameState,
  rawAction: string,
  bible: WorldBible,
  lane: Lane = 'community'
): Promise<{ state: GameState; aiResponded: boolean }> {
  const action = rawAction.slice(0, MAX_ACTION_LENGTH);
  const { check: roll, party: rolledParty, note: sigNote } = rollTurn(state);
  const rolled = { ...state, party: rolledParty };
  const { directive, effects } = resolveTurnEffects(rolled, roll, action);
  const raw = await callGemini(
    turnSystemPrompt(lane),
    buildTurnPrompt(rolled, action, roll, bible, lane, directive)
  );
  // An empty reply means the narrator was unreachable (usually rate-limited).
  // Nothing may change on such a turn — applying the pre-rolled combat damage
  // or spending a signature while telling the player "nothing happened" would
  // desync the story from the state.
  if (raw.length === 0) {
    return { state, aiResponded: false };
  }

  const next = applyTurn(
    rolled,
    parseResolveResult(raw),
    Math.random,
    effects,
    sigNote,
    roll.outcome
  );
  const beat = next.recentEvents.at(-1) ?? '';
  const recorded = appendHistory({ ...next, rolls: (next.rolls ?? 0) + 1 }, [
    { kind: 'action', text: action },
    ...(beat.length > 0
      ? [
          {
            kind: 'result' as const,
            text: beat,
            outcome: roll.outcome,
            roll: { die: roll.die, total: roll.total },
          },
        ]
      : []),
  ]);

  return {
    state: { ...recorded, lastCheck: roll },
    aiResponded: true,
  };
}

// Reads the post's comments and ranks them into the current candidate actions.
// Only comments posted since the turn opened count, so old comments don't win
// every turn. Fetched newest-first so the time filter can't be starved by a
// post's older popular comments; rankProposals then orders them by score.
// The first entry is the action that resolves.
export async function readProposals(
  postId: string,
  since: number
): Promise<Proposal[]> {
  const comments = await reddit
    .getComments({ postId: postId as PostId, sort: 'new', limit: 100 })
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
  | { status: 'won' }
  | { status: 'no_proposals' }
  | { status: 'ai_unavailable' };

// Resolves the current turn from the post's comments: the top-voted comment
// becomes the party's action. Posts the dungeon master's recap, records the
// run's standing and (on a terminal turn) its lore, and persists.
export async function resolveTurnFromComments(): Promise<ResolveOutcome> {
  const state = await loadGame();
  if (!state) return { status: 'no_game' };
  if (state.phase === 'dead') return { status: 'dead' };
  if (state.phase === 'won') return { status: 'won' };

  const proposals = await readProposals(state.postId, turnStartedAt(state));
  const winner = proposals[0] ?? null;
  if (!winner) {
    // Open a fresh voting window: without this, a long-idle board's stale
    // deadline would let the next comment resolve almost instantly, unvoted.
    await saveGame(withDeadline(state));
    return { status: 'no_proposals' };
  }

  const bible = await ensureWorldBible();
  const turn = await runTurn(state, winner.body, bible);
  if (!turn.aiResponded) {
    // The narrator was unreachable, so the turn did not happen. Change nothing:
    // the deadline stays due, so the next scheduler tick retries this same
    // winner rather than consuming the community's vote on a wash.
    return { status: 'ai_unavailable' };
  }

  const nextState = withDeadline(await withRoomIntro(turn.state, bible));
  await saveGame(nextState);

  const terminal = nextState.phase === 'dead' || nextState.phase === 'won';
  if (nextState.party.depth > state.party.depth || terminal) {
    await recordRun(nextState);
  }
  // Record the run's ending here, on the resolver itself, so the nemesis
  // remembers regardless of whether the cron, the mod menu, or the in-app
  // button resolved the final turn.
  if (terminal) {
    await appendRun(recordFromState(nextState));
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
