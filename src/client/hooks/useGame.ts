import { useCallback, useEffect, useState } from 'react';
import type { GameState, LeaderboardEntry, Proposal } from '../../shared/game';
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

export const useGame = () => {
  const [state, setState] = useState<GameHookState>(INITIAL);

  // Initial load: create the game if needed and read the player's name. The
  // poll below keeps the game fresh after this.
  useEffect(() => {
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
  }, []);

  // Poll for live state. Votes change outside our app and the scheduler resolves
  // turns on its own, so we re-read the game, proposals, and leaderboard on an
  // interval (Devvit has no websockets).
  useEffect(() => {
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
  }, []);

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

type SoloHookState = {
  game: GameState | null;
  username: string | null;
  loading: boolean;
  resolving: boolean;
  error: string | null;
};

const SOLO_INITIAL: SoloHookState = {
  game: null,
  username: null,
  loading: false,
  resolving: false,
  error: null,
};

// A private, real-time solo run. Unlike useGame there is no polling: each action
// returns the next state directly, since only the player changes the run.
export const useSolo = () => {
  const [state, setState] = useState<SoloHookState>(SOLO_INITIAL);

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
      setState((prev) => ({
        ...prev,
        game: data.state,
        resolving: false,
        error: null,
      }));
    } catch {
      setState((prev) => ({ ...prev, resolving: false, error: GENERIC_ERROR }));
    }
  }, []);

  return { ...state, start, act } as const;
};