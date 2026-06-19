import { useCallback, useEffect, useState } from 'react';
import type { GameState } from '../../shared/game';
import type { GameResponse } from '../../shared/api';

type GameHookState = {
  game: GameState | null;
  username: string | null;
  loading: boolean;
  resolving: boolean;
  error: string | null;
};

const INITIAL: GameHookState = {
  game: null,
  username: null,
  loading: true,
  resolving: false,
  error: null,
};

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
    setState((prev) => ({ ...prev, resolving: true, error: null }));
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GameResponse = await res.json();
      setState((prev) => ({
        ...prev,
        game: data.state,
        username: data.username,
        resolving: false,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        resolving: false,
        error: 'The dungeon did not respond. Try again.',
      }));
    }
  }, []);

  const submitAction = useCallback(
    (action: string) => post('/api/action', { action }),
    [post]
  );
  const restart = useCallback(() => post('/api/restart'), [post]);

  return { ...state, submitAction, restart } as const;
};
