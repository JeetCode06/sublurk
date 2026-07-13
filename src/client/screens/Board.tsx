import { useState } from 'react';
import type { GameState, LeaderboardEntry, Proposal } from '../../shared/game';
import {
  CandidateActions,
  HealthBar,
  LastCheck,
  PartyVitals,
  RestartButton,
  SceneEntities,
  StatBlock,
  ThreatStrip,
} from '../components';
import { MapButton, MapModal } from '../CampaignMap';
import { RunSummary } from './RunSummary';

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
  isMod,
  onHowItWorks,
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
  isMod: boolean;
  onHowItWorks: () => void;
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
        canRestart={isMod}
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
              <MapButton onClick={() => setMapOpen(true)} />
              {isMod && (
                <RestartButton resolving={resolving} onRestart={onRestart} />
              )}
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
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <PartyVitals party={game.party} />
            {record !== null && (
              <span className="font-label text-[12px] text-muted">
                🏆 record depth {record}
              </span>
            )}
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
                {log.map((event, i) => (
                  <p
                    key={`${i}-${event.slice(0, 24)}`}
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
            canResolve={isMod}
          />
        </main>

        <footer className="flex flex-col gap-3">
          <div className="h-px w-full bg-edge" />
          {error && (
            <p className="font-body text-[13.5px] text-[#f0594e]">{error}</p>
          )}
          {note && <p className="font-body text-[13.5px] text-ember">{note}</p>}
          <button
            type="button"
            onClick={onHowItWorks}
            className="self-center font-label text-[10px] uppercase tracking-[0.2em] text-faint transition hover:text-ember"
          >
            How it works
          </button>
          <p className="text-center font-body text-[10.5px] leading-relaxed text-faint">
            Mechanics adapted from the System Reference Document 5.1 by Wizards
            of the Coast LLC, licensed under{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/legalcode"
              target="_blank"
              rel="noreferrer"
              className="underline transition hover:text-muted"
            >
              CC BY 4.0
            </a>
            .
          </p>
        </footer>
      </div>

      {mapOpen && (
        <MapModal
          map={game.map}
          title="The descent"
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
}
