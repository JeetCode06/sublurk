import { useCallback, useEffect, useState } from 'react';
import type { GameState } from '../../shared/game';
import type { ErrorResponse, GameResponse } from '../../shared/api';

type GameHookState = {
  game: GameState | null;
  username: string | null;
  loading: boolean;
  resolving: boolean;
  error: string | null;
  note: string | null;
};

const INITIAL: GameHookState = {
  game: null,
  username: null,
  loading: true,
  resolving: false,
  error: null,
  note: null,
};

const GENERIC_ERROR = 'The dungeon did not respond. Try again.';

export const useGame = () => {
  const [state, setState] = useState<GameHookState>(INITIAL);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/game');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: GameResponse = await res.json();
        setState({
          game: data.state,
          username: data.username,
          loading: false,
          resolving: false,
          error: null,
          note: null,
        });
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