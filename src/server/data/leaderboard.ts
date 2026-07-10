import { context, redis } from '@devvit/web/server';
import type { GameState, LeaderboardEntry, SoloEntry } from '../../shared/game';

const leaderboardKey = (subredditName: string): string =>
  `crawl:${subredditName}:leaderboard`;

const runMember = (runNumber: number): string => `run:${runNumber}`;

// Records how deep a run reached, keyed by run number so each run is one entry
// and reaching a new depth simply raises that run's score.
export async function recordRun(state: GameState): Promise<void> {
  await redis.zAdd(leaderboardKey(context.subredditName), {
    member: runMember(state.runNumber),
    score: state.party.depth,
  });
}

// Returns the deepest runs, best first.
export async function topRuns(limit: number): Promise<LeaderboardEntry[]> {
  const rows = await redis.zRange(
    leaderboardKey(context.subredditName),
    0,
    limit - 1,
    { by: 'rank', reverse: true }
  );
  return rows.map((row) => ({
    runNumber: Number(row.member.replace('run:', '')),
    depth: row.score,
  }));
}

const soloKey = (subredditName: string): string =>
  `crawl:${subredditName}:solo:leaderboard`;

// Rolls are packed into the low digits of the score so one number can rank by
// depth first and by fewer rolls second. Fewer rolls yields a larger remainder,
// so a plain descending sort orders both at once.
const ROLL_SPAN = 100_000;
const MAX_ROLLS = ROLL_SPAN - 1;

export function encodeSoloScore(depth: number, rolls: number): number {
  const capped = Math.min(Math.max(rolls, 0), MAX_ROLLS);
  return depth * ROLL_SPAN + (MAX_ROLLS - capped);
}

export function decodeSoloScore(score: number): {
  depth: number;
  rolls: number;
} {
  const depth = Math.floor(score / ROLL_SPAN);
  return { depth, rolls: MAX_ROLLS - (score - depth * ROLL_SPAN) };
}

// Keeps only a player's best descent, so one player holds one place. A run that
// is not an improvement is discarded.
export async function recordSoloBest(
  username: string,
  depth: number,
  rolls: number
): Promise<void> {
  const key = soloKey(context.subredditName);
  const score = encodeSoloScore(depth, rolls);
  try {
    const existing = await redis.zScore(key, username);
    if (existing !== undefined && existing >= score) return;
  } catch {
    // No existing entry, or the read failed: fall through and write this run.
  }
  await redis.zAdd(key, { member: username, score });
}

// The best solo descents across every player, best first.
export async function topSoloRuns(limit: number): Promise<SoloEntry[]> {
  const rows = await redis.zRange(
    soloKey(context.subredditName),
    0,
    limit - 1,
    {
      by: 'rank',
      reverse: true,
    }
  );
  return rows.map((row) => ({
    username: row.member,
    ...decodeSoloScore(row.score),
  }));
}