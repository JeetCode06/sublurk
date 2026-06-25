import { useState } from 'react';
import type { GameState, LeaderboardEntry, Proposal } from '../../shared/game';
import {
  CampaignMap,
  CandidateActions,
  HealthBar,
  LastCheck,
  RestartButton,
  SceneEntities,
  StatBlock,
  ThreatStrip,
} from '../components';
import { RunSummary } from './RunSummary';

export function Board({
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
}: Readonly<{
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
}>) {
  const [draft, setDraft] = useState('');

  if (game.phase === 'dead' || game.phase === 'won') {
    return (
      <RunSummary
        game={game}
        restarting={resolving}
        onRestart={onRestart}
        leaderboard={leaderboard}
        currentRun={game.runNumber}
      />
    );
  }

  const log = game.recentEvents.slice().reverse();
  const record = leaderboard[0]?.depth ?? null;
  const scene =
    game.room.description ||
    'The party presses into the dark. The dungeon master is setting the scene…';

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
              <RestartButton resolving={resolving} onRestart={onRestart} />
            </div>
          </div>
          <HealthBar hp={game.party.hp} maxHp={game.party.maxHp} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[#8a7d72]">
            <span>◈ {game.party.gold} gold</span>
            {game.party.inventory.length > 0 && (
              <span>⚸ {game.party.inventory.join(', ')}</span>
            )}
            {game.party.conditions.length > 0 && (
              <span className="text-[#c0392b] capitalize">
                {game.party.conditions.join(', ')}
              </span>
            )}
            {record !== null && <span>🏆 record depth {record}</span>}
          </div>
          <StatBlock abilities={game.party.abilities} />
        </header>

        <main className="flex flex-1 flex-col gap-5">
          {game.intro.length > 0 && (
            <section className="rounded border border-[#3a302b] bg-[#211b17] px-4 py-3">
              <p className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#8a7d72]">
                Prologue
              </p>
              <p className="text-sm italic leading-relaxed text-[#c9b896]">
                {game.intro}
              </p>
            </section>
          )}
          <CampaignMap map={game.map} />
          <section className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
              {game.room.type} · depth {game.party.depth}
            </p>
            <p className="text-lg leading-relaxed text-[#e8ddc8]">{scene}</p>
            {game.lastCheck && <LastCheck check={game.lastCheck} />}
            <SceneEntities entities={game.room.entities} />
            <ThreatStrip threats={game.room.threats} />
            {log.length > 0 && (
              <div className="flex flex-col gap-2 border-l-2 border-[#3a302b] pl-4">
                {log.map((event) => (
                  <p
                    key={event}
                    className="text-sm leading-relaxed text-[#8a7d72]"
                  >
                    {event}
                  </p>
                ))}
              </div>
            )}
          </section>

          <p className="text-sm leading-relaxed text-[#a89880]">
            Reply to this post with what the party should do, or upvote an
            action below. When the turn resolves, the top-voted action is the
            one the party takes.
          </p>
          <CandidateActions
            proposals={proposals}
            resolving={resolving}
            deadline={game.nextResolveAt}
            serverOffset={serverOffset}
            onResolveVotes={onResolveVotes}
          />
        </main>

        <footer className="flex flex-col gap-3 border-t border-[#3a302b] pt-4">
          {error && <p className="text-sm text-[#c0392b]">{error}</p>}
          {note && <p className="text-sm text-[#e8893f]">{note}</p>}
          <div className="flex flex-col gap-2 rounded border border-[#3a302b] bg-[#1f1916] px-3 py-3">
            <p className="font-mono text-[0.65rem] uppercase tracking-widest text-[#5a4f47]">
              Playing solo? Take a single action directly
            </p>
            {game.room.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {game.room.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setDraft(suggestion)}
                    disabled={resolving}
                    className="rounded-full border border-[#3a302b] bg-[#241d1a] px-2.5 py-1 text-xs text-[#c9b896] transition-colors hover:border-[#e8893f] hover:text-[#e8ddc8] disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
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
        </footer>
      </div>
    </div>
  );
}
