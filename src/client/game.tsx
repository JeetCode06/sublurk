import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  EntityKind,
  GameState,
  LeaderboardEntry,
  Proposal,
  SceneEntity,
} from '../shared/game';
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
          onClick={() => {
            onRestart();
            setConfirming(false);
          }}
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

function Countdown({
  deadline,
  serverOffset,
}: {
  deadline: number;
  serverOffset: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // No deadline yet, or no server-clock reading to correct for drift.
  if (deadline <= 0 || serverOffset === null) return null;

  const remainingMs = deadline - (now + serverOffset);
  if (remainingMs <= 0) {
    return (
      <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#e8893f]">
        resolving soon…
      </span>
    );
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return (
    <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#8a7d72]">
      resolves in {minutes}:{seconds}
    </span>
  );
}

function CandidateActions({
  proposals,
  resolving,
  deadline,
  serverOffset,
  onResolveVotes,
}: {
  proposals: Proposal[];
  resolving: boolean;
  deadline: number;
  serverOffset: number | null;
  onResolveVotes: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
          Candidate actions
        </h2>
        <Countdown deadline={deadline} serverOffset={serverOffset} />
      </div>

      {proposals.length === 0 ? (
        <p className="rounded border border-dashed border-[#3a302b] px-4 py-6 text-center text-sm text-[#8a7d72]">
          No actions proposed yet. Reply to this post with what the party should
          do — it appears here for the hive to vote on.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {proposals.map((proposal, index) => {
            const leading = index === 0;
            return (
              <li
                key={proposal.id}
                className={`flex items-start gap-3 rounded border px-3 py-2.5 ${
                  leading
                    ? 'border-[#e8893f] bg-[#2a211b]'
                    : 'border-[#3a302b] bg-[#241d1a]'
                }`}
              >
                <span
                  className={`flex min-w-[2.75rem] flex-col items-center font-mono leading-tight ${
                    leading ? 'text-[#f0a050]' : 'text-[#8a7d72]'
                  }`}
                >
                  <span className="text-sm tabular-nums">
                    ▲ {proposal.score}
                  </span>
                  {leading && (
                    <span className="text-[0.6rem] uppercase tracking-wide">
                      leading
                    </span>
                  )}
                </span>
                <span className="line-clamp-3 flex-1 text-sm leading-relaxed text-[#e8ddc8]">
                  {proposal.body}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={onResolveVotes}
        disabled={resolving || proposals.length === 0}
        className="self-start rounded border border-[#3a302b] px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#8a7d72] transition-colors hover:border-[#e8893f] hover:text-[#e8893f] disabled:opacity-40"
      >
        {resolving ? 'resolving…' : '🎲 resolve top-voted action'}
      </button>
    </section>
  );
}

function Leaderboard({
  entries,
  currentRun,
}: {
  entries: LeaderboardEntry[];
  currentRun: number;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
        Deepest runs
      </h2>
      <ol className="flex flex-col gap-1">
        {entries.map((entry, index) => {
          const current = entry.runNumber === currentRun;
          return (
            <li
              key={entry.runNumber}
              className={`flex items-baseline justify-between gap-3 rounded px-3 py-1.5 font-mono text-sm ${
                current ? 'bg-[#2a211b] text-[#f0a050]' : 'text-[#a89880]'
              }`}
            >
              <span>
                {index + 1}. Run {entry.runNumber}
                {current && ' · this run'}
              </span>
              <span className="tabular-nums">depth {entry.depth}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const ENTITY_GLYPH: Record<EntityKind, { icon: string; tone: string }> = {
  foe: { icon: '☠', tone: 'text-[#d98a80]' },
  npc: { icon: '☻', tone: 'text-[#e8c070]' },
  object: { icon: '◇', tone: 'text-[#9fb0c0]' },
};

function ThreatPips({ threat }: { threat: number }) {
  return (
    <span className="flex gap-0.5" title={`threat ${threat} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= threat ? 'text-[#c0392b]' : 'text-[#3a302b]'}
        >
          ●
        </span>
      ))}
    </span>
  );
}

function EntityCard({ entity }: { entity: SceneEntity }) {
  const glyph = ENTITY_GLYPH[entity.kind];
  const showStats =
    entity.kind === 'foe' &&
    (entity.threat !== undefined || entity.hp !== undefined);
  return (
    <div className="flex flex-col gap-1.5 rounded border border-[#3a302b] bg-[#241d1a] px-3 py-2.5">
      <div className="flex items-baseline gap-2">
        <span className={`text-sm ${glyph.tone}`}>{glyph.icon}</span>
        <span className="flex-1 text-sm font-semibold text-[#e8ddc8]">
          {entity.name}
        </span>
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-[#5a4f47]">
          {entity.kind}
        </span>
      </div>
      {entity.blurb && (
        <p className="text-xs leading-relaxed text-[#8a7d72]">{entity.blurb}</p>
      )}
      {showStats && (
        <div className="flex items-center gap-3 font-mono text-[0.65rem] text-[#8a7d72]">
          {entity.threat !== undefined && <ThreatPips threat={entity.threat} />}
          {entity.hp !== undefined && (
            <span className="tabular-nums">{entity.hp} hp</span>
          )}
        </div>
      )}
    </div>
  );
}

function SceneEntities({ entities }: { entities: SceneEntity[] }) {
  if (entities.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
        In the room
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entities.map((entity, i) => (
          <EntityCard
            key={`${entity.kind}-${entity.name}-${i}`}
            entity={entity}
          />
        ))}
      </div>
    </section>
  );
}

function ThreatStrip({ threats }: { threats: string[] }) {
  if (threats.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-[#c0392b]">
        ⚠ dangers
      </span>
      {threats.map((threat, i) => (
        <span
          key={i}
          className="rounded-full border border-[#5a2a25] bg-[#271a18] px-2.5 py-0.5 text-xs text-[#d98a80]"
        >
          {threat}
        </span>
      ))}
    </div>
  );
}

function Board({
  game,
  resolving,
  error,
  note,
  proposals,
  serverOffset,
  leaderboard,
  onAct,
  onResolveVotes,
  onRestart,
}: {
  game: GameState;
  resolving: boolean;
  error: string | null;
  note: string | null;
  proposals: Proposal[];
  serverOffset: number | null;
  leaderboard: LeaderboardEntry[];
  onAct: (action: string) => void;
  onResolveVotes: () => void;
  onRestart: () => void;
}) {
  const [draft, setDraft] = useState('');
  const events = game.recentEvents;
  const dead = game.phase === 'dead';
  const scene = dead
    ? (events.at(-1) ??
      'The party has fallen. The dungeon falls silent around them.')
    : game.room.description ||
      'The party presses into the dark. The dungeon master is setting the scene…';
  const log = (dead ? events.slice(0, -1) : events.slice()).reverse();
  const record = leaderboard[0]?.depth ?? null;

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
            {record !== null && <span>🏆 record depth {record}</span>}
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-5">
          <section className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
              {dead
                ? 'The run ends'
                : `${game.room.type} · depth ${game.party.depth}`}
            </p>
            <p className="text-lg leading-relaxed text-[#e8ddc8]">{scene}</p>
            {!dead && <SceneEntities entities={game.room.entities} />}
            {!dead && <ThreatStrip threats={game.room.threats} />}
            {log.length > 0 && (
              <div className="flex flex-col gap-2 border-l-2 border-[#3a302b] pl-4">
                {log.map((event, i) => (
                  <p key={i} className="text-sm leading-relaxed text-[#8a7d72]">
                    {event}
                  </p>
                ))}
              </div>
            )}
          </section>

          {!dead && (
            <>
              <p className="text-sm leading-relaxed text-[#a89880]">
                Reply to this post with what the party should do, or upvote an
                action below. When the turn resolves, the top-voted action is
                the one the party takes.
              </p>
              <CandidateActions
                proposals={proposals}
                resolving={resolving}
                deadline={game.nextResolveAt}
                serverOffset={serverOffset}
                onResolveVotes={onResolveVotes}
              />
            </>
          )}

          {dead && (
            <Leaderboard entries={leaderboard} currentRun={game.runNumber} />
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
            <div className="flex flex-col gap-2 rounded border border-[#3a302b] bg-[#1f1916] px-3 py-3">
              <label className="font-mono text-[0.65rem] uppercase tracking-widest text-[#5a4f47]">
                Playing solo? Take a single action directly
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
            </div>
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
    proposals,
    serverOffset,
    leaderboard,
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
      proposals={proposals}
      serverOffset={serverOffset}
      leaderboard={leaderboard}
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
