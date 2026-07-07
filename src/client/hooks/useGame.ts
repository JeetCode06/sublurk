import { useCallback, useEffect, useState } from 'react';
import type {
  GameState,
  LeaderboardEntry,
  Outcome,
  Proposal,
} from '../../shared/game';
import type {
  ErrorResponse,
  GameResponse,
  LeaderboardResponse,
  ProposalsResponse,
} from '../../shared/api';

type GameHookState = {
  game: GameState | null;
  username: string | null;
  loading: boolean;
  resolving: boolean;
  error: string | null;
  note: string | null;
  proposals: Proposal[];
  serverOffset: number | null;
  leaderboard: LeaderboardEntry[];
};

const INITIAL: GameHookState = {
  game: null,
  username: null,
  loading: true,
  resolving: false,
  error: null,
  note: null,
  proposals: [],
  serverOffset: null,
  leaderboard: [],
};

const GENERIC_ERROR = 'The dungeon did not respond. Try again.';
const POLL_INTERVAL_MS = 5000;

// Fetches the leaderboard without touching React state, so callers decide when
// to apply it. This keeps setState out of an effect body directly.
async function fetchLeaderboard(): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) return null;
    const data = (await res.json()) as LeaderboardResponse | ErrorResponse;
    return 'type' in data ? data.entries : null;
  } catch {
    return null;
  }
}

export const useGame = (active: boolean) => {
  const [state, setState] = useState<GameHookState>(INITIAL);

  // Initial load: create the game if needed and read the player's name. The
  // poll below keeps the game fresh after this. Only runs on a community post,
  // so a solo post never spins up (or generates a scene for) a community game.
  useEffect(() => {
    if (!active) return;
    const load = async () => {
      try {
        const res = await fetch('/api/game');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: GameResponse = await res.json();
        setState((prev) => ({
          ...prev,
          game: data.state,
          username: data.username,
          loading: false,
          error: null,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'The dungeon is sealed. Reload to try again.',
        }));
      }
    };
    void load();
  }, [active]);

  // Poll for live state. Votes change outside our app and the scheduler resolves
  // turns on its own, so we re-read the game, proposals, and leaderboard on an
  // interval (Devvit has no websockets).
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/proposals');
        if (res.ok) {
          const data = (await res.json()) as ProposalsResponse | ErrorResponse;
          if (!cancelled && 'type' in data) {
            setState((prev) => ({
              ...prev,
              proposals: data.proposals,
              serverOffset: data.serverNow - Date.now(),
              game: data.state ?? prev.game,
            }));
          }
        }
      } catch {
        // A failed poll keeps the last known state rather than blanking it.
      }
      const entries = await fetchLeaderboard();
      if (!cancelled && entries) {
        setState((prev) => ({ ...prev, leaderboard: entries }));
      }
    };
    void poll();
    const id = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active]);

  const post = useCallback(async (path: string, payload?: unknown) => {
    setState((prev) => ({ ...prev, resolving: true, error: null, note: null }));
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });
      const data = (await res.json()) as GameResponse | ErrorResponse;
      if (!res.ok || !('type' in data)) {
        const message = 'message' in data ? data.message : GENERIC_ERROR;
        setState((prev) => ({ ...prev, resolving: false, error: message }));
        return;
      }
      setState((prev) => ({
        ...prev,
        game: data.state,
        username: data.username,
        resolving: false,
        error: null,
        note: data.note ?? null,
      }));
    } catch {
      setState((prev) => ({ ...prev, resolving: false, error: GENERIC_ERROR }));
    }
  }, []);

  const submitAction = useCallback(
    (action: string) => post('/api/action', { action }),
    [post]
  );
  const resolveVotes = useCallback(() => post('/api/resolve'), [post]);
  const restart = useCallback(() => post('/api/restart'), [post]);

  return { ...state, submitAction, resolveVotes, restart } as const;
};

// One beat in the solo run's running transcript. Solo state is replaced whole
// on every turn and recentEvents is capped, so the client accumulates the full
// story here instead: the dungeon's scenes, the player's moves, and each result.
export type TranscriptEntry =
  | { id: number; kind: 'scene'; text: string }
  | { id: number; kind: 'action'; text: string }
  | {
      id: number;
      kind: 'result';
      text: string;
      outcome: Outcome;
      roll: { die: number; total: number } | null;
    };

type SoloHookState = {
  game: GameState | null;
  username: string | null;
  loading: boolean;
  resolving: boolean;
  error: string | null;
  transcript: TranscriptEntry[];
  // When the narrator is spent (rate-limited), the timestamp until which acting
  // is paused, shown to the player as an "out of energy" cooldown.
  cooldownUntil: number | null;
};

// How long the dark takes to gather itself after an unreachable turn. Long
// enough for a per-minute rate limit to ease, framed as recovering energy.
export const COOLDOWN_MS = 30_000;

const SOLO_INITIAL: SoloHookState = {
  game: null,
  username: null,
  loading: true,
  resolving: false,
  error: null,
  transcript: [],
  cooldownUntil: null,
};

// The transcript entries opening a fresh run: the prologue, then the first
// chamber's scene.
function openingTranscript(game: GameState): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  if (game.intro.length > 0)
    entries.push({ id: 0, kind: 'scene', text: game.intro });
  if (game.room.description.length > 0)
    entries.push({
      id: entries.length,
      kind: 'scene',
      text: game.room.description,
    });
  return entries;
}

// The transcript for a resumed run. The full history isn't persisted, so this
// rebuilds enough context from the saved state — the last few beats and the
// current room — for the player to pick up where they left off.
function resumeTranscript(game: GameState): TranscriptEntry[] {
  const entries: TranscriptEntry[] = game.recentEvents
    .slice(-3)
    .filter((text) => text.length > 0)
    .map((text, id) => ({ id, kind: 'scene' as const, text }));
  const desc = game.room.description;
  if (desc.length > 0 && game.recentEvents.at(-1) !== desc) {
    entries.push({ id: entries.length, kind: 'scene', text: desc });
  }
  return entries;
}

// A private, real-time solo run. Unlike useGame there is no polling: each action
// returns the next state directly, since only the player changes the run.
export const useSolo = () => {
  const [state, setState] = useState<SoloHookState>(SOLO_INITIAL);

  // On mount, look for a saved run to resume. A missing run just clears the
  // loading state, and the app then offers character select.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch('/api/solo/game');
        const data = (await res.json()) as
          | GameResponse
          | { type: 'none' }
          | ErrorResponse;
        if (!active) return;
        if (res.ok && 'type' in data && data.type === 'game') {
          setState({
            game: data.state,
            username: data.username,
            loading: false,
            resolving: false,
            error: null,
            transcript: resumeTranscript(data.state),
            cooldownUntil: null,
          });
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        if (active) setState((prev) => ({ ...prev, loading: false }));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const start = useCallback(async (classId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/solo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId }),
      });
      const data = (await res.json()) as GameResponse | ErrorResponse;
      if (!res.ok || !('type' in data)) {
        const message = 'message' in data ? data.message : GENERIC_ERROR;
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return;
      }
      setState({
        game: data.state,
        username: data.username,
        loading: false,
        resolving: false,
        error: null,
        transcript: openingTranscript(data.state),
        cooldownUntil: null,
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: GENERIC_ERROR }));
    }
  }, []);

  const act = useCallback(async (action: string) => {
    setState((prev) => ({ ...prev, resolving: true, error: null }));
    try {
      const res = await fetch('/api/solo/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as GameResponse | ErrorResponse;
      if (!res.ok || !('type' in data)) {
        const message = 'message' in data ? data.message : GENERIC_ERROR;
        setState((prev) => ({ ...prev, resolving: false, error: message }));
        return;
      }
      const degraded = data.degraded === true;
      setState((prev) => {
        const next = data.state;
        if (degraded) {
          // The narrator was unreachable: a wash turn. Don't record it, just
          // pause acting so the player waits rather than retrying into the wall.
          return {
            ...prev,
            game: next,
            resolving: false,
            error: null,
            cooldownUntil: Date.now() + COOLDOWN_MS,
          };
        }
        const prevScene = prev.game?.room.description ?? '';
        const narration = next.recentEvents.at(-1) ?? '';
        const check = next.lastCheck ?? null;
        let id =
          prev.transcript.reduce((max, e) => Math.max(max, e.id), -1) + 1;
        const additions: TranscriptEntry[] = [
          { id: id++, kind: 'action', text: action },
        ];
        if (narration.length > 0) {
          additions.push({
            id: id++,
            kind: 'result',
            text: narration,
            outcome: check?.outcome ?? 'partial',
            roll: check ? { die: check.die, total: check.total } : null,
          });
        }
        if (
          next.room.description.length > 0 &&
          next.room.description !== prevScene
        ) {
          additions.push({
            id,
            kind: 'scene',
            text: next.room.description,
          });
        }
        return {
          ...prev,
          game: next,
          resolving: false,
          error: null,
          transcript: [...prev.transcript, ...additions],
          cooldownUntil: null,
        };
      });
    } catch {
      setState((prev) => ({ ...prev, resolving: false, error: GENERIC_ERROR }));
    }
  }, []);

  return { ...state, start, act } as const;
};