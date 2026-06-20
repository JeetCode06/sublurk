import './index.css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameState } from '../shared/game';
import { useGame } from './hooks/useGame';

function HealthBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const low = hp <= maxHp * 0.3;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/40">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            low ? 'bg-[#c0392b]' : 'bg-[#e8893f]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-sm tabular-nums text-[#d9c9a8]">
        {hp}/{maxHp}
      </span>
    </div>
  );
}

function RestartButton({
  resolving,
  onRestart,
}: {
  resolving: boolean;
  onRestart: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex items-center gap-2 font-mono text-xs">
        <span className="text-[#8a7d72]">abandon run?</span>
        <button
          onClick={onRestart}
          disabled={resolving}
          className="text-[#c0392b] hover:underline disabled:opacity-50"
        >
          yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[#8a7d72] hover:underline"
        >
          no
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="font-mono text-xs text-[#8a7d72] transition-colors hover:text-[#e8893f]"
    >
      ↻ new run
    </button>
  );
}

function Board({
  game,
  resolving,
  error,
  note,
  onAct,
  onResolveVotes,
  onRestart,
}: {
  game: GameState;
  resolving: boolean;
  error: string | null;
  note: string | null;
  onAct: (action: string) => void;
  onResolveVotes: () => void;
  onRestart: () => void;
}) {
  const [draft, setDraft] = useState('');
  const events = game.recentEvents;
  const latest = events.length > 0 ? events[events.length - 1] : null;
  const earlier = events.slice(0, -1).reverse();
  const dead = game.phase === 'dead';

  const submit = () => {
    const action = draft.trim();
    if (action.length === 0 || resolving) return;
    onAct(action);
    setDraft('');
  };

  return (
    <div className="flex min-h-screen justify-center bg-[#1a1614] text-[#e8ddc8]">
      <div className="flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
        <header className="flex flex-col gap-3 border-b border-[#3a302b] pb-4">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-wide text-[#f0a050]">
              {game.party.name}
            </h1>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-[#8a7d72]">
                Run {game.runNumber} · Depth {game.party.depth}
              </span>
              {!dead && (
                <RestartButton resolving={resolving} onRestart={onRestart} />
              )}
            </div>
          </div>
          <HealthBar hp={game.party.hp} maxHp={game.party.maxHp} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[#8a7d72]">
            <span>◈ {game.party.gold} gold</span>
            {game.party.inventory.length > 0 && (
              <span>⚸ {game.party.inventory.join(', ')}</span>
            )}
            {game.party.statuses.length > 0 && (
              <span className="text-[#c0392b]">
                {game.party.statuses.join(', ')}
              </span>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
            {dead
              ? 'The run ends'
              : `${game.room.type} · depth ${game.party.depth}`}
          </p>
          <p className="text-lg leading-relaxed text-[#e8ddc8]">
            {latest ??
              'The party stands at the threshold, torchlight trembling. The dungeon waits for their first move.'}
          </p>
          {earlier.length > 0 && (
            <div className="flex flex-col gap-2 border-l-2 border-[#3a302b] pl-4">
              {earlier.map((event, i) => (
                <p key={i} className="text-sm leading-relaxed text-[#8a7d72]">
                  {event}
                </p>
              ))}
            </div>
          )}
        </main>

        <footer className="flex flex-col gap-3 border-t border-[#3a302b] pt-4">
          {error && <p className="text-sm text-[#c0392b]">{error}</p>}
          {note && <p className="text-sm text-[#e8893f]">{note}</p>}
          {dead ? (
            <button
              onClick={onRestart}
              disabled={resolving}
              className="self-start rounded bg-[#e8893f] px-5 py-2.5 font-semibold text-[#1a1614] transition-colors hover:bg-[#f0a050] disabled:opacity-50"
            >
              {resolving ? 'Raising a new party…' : 'Begin a new run'}
            </button>
          ) : (
            <>
              <label className="font-mono text-xs uppercase tracking-widest text-[#8a7d72]">
                What does the party do?
              </label>
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit();
                  }}
                  disabled={resolving}
                  placeholder="Search the altar, draw a blade, light a torch…"
                  className="flex-1 rounded border border-[#3a302b] bg-[#241d1a] px-3 py-2.5 text-[#e8ddc8] outline-none placeholder:text-[#5a4f47] focus:border-[#e8893f] disabled:opacity-50"
                />
                <button
                  onClick={submit}
                  disabled={resolving || draft.trim().length === 0}
                  className="rounded bg-[#e8893f] px-5 py-2.5 font-semibold text-[#1a1614] transition-colors hover:bg-[#f0a050] disabled:opacity-40"
                >
                  {resolving ? '…' : 'Act'}
                </button>
              </div>
              <button
                onClick={onResolveVotes}
                disabled={resolving}
                className="self-start rounded border border-[#3a302b] px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#8a7d72] transition-colors hover:border-[#e8893f] hover:text-[#e8893f] disabled:opacity-40"
              >
                {resolving ? 'resolving…' : '🎲 resolve top-voted comment'}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

export const App = () => {
  const {
    game,
    loading,
    resolving,
    error,
    note,
    submitAction,
    resolveVotes,
    restart,
  } = useGame();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1614] font-mono text-sm text-[#8a7d72]">
        Lighting the torches…
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1614] px-6 text-center text-[#e8ddc8]">
        <p>{error ?? 'The dungeon is sealed. Reload to try again.'}</p>
      </div>
    );
  }

  return (
    <Board
      game={game}
      resolving={resolving}
      error={error}
      note={note}
      onAct={submitAction}
      onResolveVotes={resolveVotes}
      onRestart={restart}
    />
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
