import { useState } from 'react';
import { useSolo } from '../hooks/useGame';
import {
  CampaignMap,
  HealthBar,
  LastCheck,
  SceneEntities,
  StatBlock,
  ThreatStrip,
} from '../components';
import { RunSummary } from './RunSummary';

export function SoloPlay({
  solo,
  classId,
  onExit,
}: Readonly<{
  solo: ReturnType<typeof useSolo>;
  classId: string;
  onExit: () => void;
}>) {
  const [draft, setDraft] = useState('');
  const { game, loading, resolving, error } = solo;

  if (loading || !game) {
    return (
      <div className="torchlit flex min-h-screen items-center justify-center px-6 text-center font-body text-[15px] italic text-muted">
        {loading ? 'Descending into the dark…' : (error ?? 'No solo run yet.')}
      </div>
    );
  }

  if (game.phase === 'dead' || game.phase === 'won') {
    return (
      <RunSummary
        game={game}
        restarting={resolving}
        onRestart={() => void solo.start(classId)}
        onExit={onExit}
      />
    );
  }

  const log = game.recentEvents.slice(-3);
  const scene =
    game.room.description ||
    'You press into the dark. The dungeon stirs, deciding what you find…';

  const submit = () => {
    const action = draft.trim();
    if (action.length === 0 || resolving) return;
    void solo.act(action);
    setDraft('');
  };

  return (
    <div className="torchlit relative min-h-screen w-full">
      <div className="relative mx-auto flex w-full max-w-[470px] flex-col gap-5 px-5 py-6">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExit}
              className="font-label text-[10px] uppercase tracking-[0.18em] text-faint transition hover:text-ember"
            >
              ‹ Modes
            </button>
            <span className="font-label text-[10px] uppercase tracking-[0.18em] text-muted">
              Solo · Run {game.runNumber}
            </span>
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
            <span>◈ {game.party.gold} gold</span>
            {game.party.inventory.length > 0 && (
              <span>⚸ {game.party.inventory.join(', ')}</span>
            )}
            {game.party.conditions.length > 0 && (
              <span className="capitalize text-[#f0594e]">
                {game.party.conditions.join(', ')}
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
          <CampaignMap map={game.map} />
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
        </main>

        <footer className="flex flex-col gap-3">
          <div className="h-px w-full bg-edge" />
          {error && (
            <p className="font-body text-[13.5px] text-[#f0594e]">{error}</p>
          )}
          <div className="flex flex-col gap-2.5 rounded-2xl border border-[#2f2722] bg-[#130d0a] px-3 py-3">
            {game.room.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {game.room.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setDraft(suggestion)}
                    disabled={resolving}
                    className="rounded-full border border-[#3a302b] bg-[#1a130d] px-2.5 py-1 font-body text-[12.5px] text-parchment transition-colors hover:border-ember hover:text-ink disabled:opacity-50"
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
                className="flex-1 rounded-xl border border-[#3a302b] bg-[#1a130d] px-3 py-2.5 font-body text-[14px] text-ink outline-none placeholder:italic placeholder:text-faint focus:border-ember disabled:opacity-50"
              />
              <button
                onClick={submit}
                disabled={resolving || draft.trim().length === 0}
                className="rounded-xl bg-ember px-5 py-2.5 font-label text-[13px] font-semibold uppercase tracking-wide text-[#150d06] transition hover:brightness-110 disabled:opacity-40"
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
