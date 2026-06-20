import { context, redis } from '@devvit/web/server';
import type { GameState, LeaderboardEntry } from '../../shared/game';

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