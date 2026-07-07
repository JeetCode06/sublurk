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

// A folded-map glyph for the button that opens the campaign map.
function MapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 4 3 6.2v13.8l6-2.2 6 2.2 6-2.2V3.8l-6 2.2-6-2.2Z" />
      <path d="M9 4v13.8M15 6.2V20" />
    </svg>
  );
}

export function Board({
  game,
  resolving,
  error,
  note,
  proposals,
  serverOffset,
  leaderboard,
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
  onResolveVotes: () => void;
  onRestart: () => void;
}>) {
  const [mapOpen, setMapOpen] = useState(false);

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

  const log = game.recentEvents.slice(-3);
  const record = leaderboard[0]?.depth ?? null;
  const scene =
    game.room.description ||
    'The party presses into the dark. The dungeon stirs, deciding what you find…';

  return (
    <div className="torchlit relative min-h-screen w-full">
      <div className="relative mx-auto flex w-full max-w-[470px] flex-col gap-5 px-5 py-6">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-label text-[10px] uppercase tracking-[0.18em] text-muted">
              Community · Run {game.runNumber}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#5a3a1e] bg-[#1d130b] px-2.5 py-1 font-label text-[11px] uppercase tracking-[0.12em] text-ember-glow transition hover:brightness-110"
              >
                <MapIcon /> Map
              </button>
              <RestartButton resolving={resolving} onRestart={onRestart} />
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <h1 className="font-display text-[24px] font-bold leading-none text-[#f6b063]">
              {game.party.name}
            </h1>
            <span className="shrink-0 rounded-lg border border-[#5a3a1e] bg-[#1d130b] px-2.5 py-1 font-label text-[11px] uppercase tracking-[0.14em] text-ember-glow">
              Depth {game.party.depth}
            </span>
          </div>
          <HealthBar hp={game.party.hp} maxHp={game.party.maxHp} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-label text-[12px] text-muted">
            <span>◈ {game.party.embers} embers</span>
            {game.party.inventory.length > 0 && (
              <span>⚸ {game.party.inventory.join(', ')}</span>
            )}
            {game.party.conditions.length > 0 && (
              <span className="capitalize text-[#f0594e]">
                {game.party.conditions.join(', ')}
              </span>
            )}
            {record !== null && <span>🏆 record depth {record}</span>}
          </div>
          <StatBlock abilities={game.party.abilities} />
          <div className="h-px w-full bg-edge" />
        </header>

        <main className="flex flex-1 flex-col gap-5">
          {game.intro.length > 0 && (
            <section className="rounded-2xl border border-[#2f2722] bg-[#130d0a] px-4 py-3">
              <p className="mb-1.5 font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Prologue
              </p>
              <p className="font-body text-[14px] italic leading-relaxed text-parchment">
                {game.intro}
              </p>
            </section>
          )}
          <section className="flex flex-col gap-3">
            <p className="font-label text-[11px] font-semibold uppercase tracking-[0.24em] text-ember">
              <span className="capitalize">{game.room.type}</span> · depth{' '}
              {game.party.depth}
            </p>
            <div className="rounded-2xl border border-[#2a2018] bg-[#120d09] px-4 py-3.5">
              <p className="font-body text-[16px] leading-relaxed text-ink">
                {scene}
              </p>
            </div>
            {game.lastCheck && <LastCheck check={game.lastCheck} />}
            <SceneEntities entities={game.room.entities} />
            <ThreatStrip threats={game.room.threats} />
            {log.length > 0 && (
              <div className="flex flex-col gap-1.5 border-l-2 border-[#2f2722] pl-3.5">
                {log.map((event) => (
                  <p
                    key={event}
                    className="font-body text-[13px] italic leading-snug text-muted"
                  >
                    {event}
                  </p>
                ))}
              </div>
            )}
          </section>

          <p className="font-body text-[13.5px] leading-snug text-muted">
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

        <footer className="flex flex-col gap-3">
          <div className="h-px w-full bg-edge" />
          {error && (
            <p className="font-body text-[13.5px] text-[#f0594e]">{error}</p>
          )}
          {note && <p className="font-body text-[13.5px] text-ember">{note}</p>}
        </footer>
      </div>

      {mapOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0705]/90 p-6"
          onClick={() => setMapOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-2xl border border-edge bg-[#100b08] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-label text-[11px] uppercase tracking-[0.2em] text-muted">
                The descent
              </span>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                className="font-label text-[11px] uppercase tracking-[0.2em] text-faint transition hover:text-ember"
              >
                Close
              </button>
            </div>
            <CampaignMap map={game.map} />
          </div>
        </div>
      )}
    </div>
  );
}
