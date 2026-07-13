import { useCallback, useEffect, useRef, useState } from 'react';
import type { Outcome } from '../../shared/game';
import { useSolo, COOLDOWN_MS, type TranscriptEntry } from '../hooks/useGame';
import {
  HealthBar,
  PartyVitals,
  SceneEntities,
  StatBlock,
  ThreatStrip,
} from '../components';
import { MapButton, MapModal } from '../CampaignMap';
import { RunSummary } from './RunSummary';
import { DiceOverlay } from '../DiceOverlay';

const OUTCOME_LABEL: Record<Outcome, string> = {
  success: 'Success',
  partial: 'Partial',
  fail: 'Failure',
};

const OUTCOME_COLOR: Record<Outcome, string> = {
  success: '#e8c15a',
  partial: '#f6b063',
  fail: '#f0594e',
};

// One rendered beat of the running story: the dungeon's prose (scene), the
// player's own move (action), or the result of that move with its roll.
function TranscriptBeat({ entry }: Readonly<{ entry: TranscriptEntry }>) {
  if (entry.kind === 'action') {
    return (
      <div className="border-l-2 border-[#5a3a1e] pl-3">
        <div className="font-label text-[10px] uppercase tracking-[0.18em] text-ember">
          You
        </div>
        <p className="mt-0.5 font-body text-[14.5px] italic leading-snug text-parchment">
          {entry.text}
        </p>
      </div>
    );
  }
  if (entry.kind === 'result') {
    return (
      <div>
        <p className="font-body text-[15px] leading-relaxed text-ink">
          {entry.text}
        </p>
        {entry.roll && (
          <div
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-[#2f2722] bg-[#160f0a] px-2 py-0.5 font-label text-[11px] tracking-wide"
            style={{ color: OUTCOME_COLOR[entry.outcome] }}
          >
            <span aria-hidden="true">⚄</span> d20 {entry.roll.die} · total{' '}
            {entry.roll.total} · {OUTCOME_LABEL[entry.outcome]}
          </div>
        )}
      </div>
    );
  }
  return (
    <p className="font-body text-[15px] leading-relaxed text-ink">
      {entry.text}
    </p>
  );
}

export function SoloPlay({
  solo,
  onExit,
  onNewRun,
}: Readonly<{
  solo: ReturnType<typeof useSolo>;
  onExit: () => void;
  onNewRun: () => void;
}>) {
  const [draft, setDraft] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [rollActive, setRollActive] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const endRef = useRef<HTMLDivElement>(null);
  const { game, loading, resolving, error, transcript, cooldownUntil } = solo;

  const endRoll = useCallback(() => setRollActive(false), []);

  const cooldownLeft = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0;
  const onCooldown = cooldownLeft > 0;

  // Keep the newest beat and the input in view as the story grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript.length]);

  // Tick the countdown while the dark gathers itself.
  useEffect(() => {
    if (!onCooldown) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [onCooldown]);

  if (loading || !game) {
    return (
      <div className="torchlit flex min-h-screen items-center justify-center px-6 text-center font-body text-[15px] italic text-muted">
        {loading ? 'Down into the dark…' : (error ?? 'No solo run yet.')}
      </div>
    );
  }

  if (game.phase === 'dead' || game.phase === 'won') {
    return (
      <RunSummary
        game={game}
        restarting={resolving}
        onRestart={onNewRun}
        onExit={onExit}
        soloLeaderboard={solo.soloLeaderboard}
        username={solo.username}
      />
    );
  }

  // Submits an action — from the input, or straight from a tapped suggestion
  // chip, so the common case is one tap instead of fill-then-Act.
  const submit = (text: string) => {
    const action = text.trim();
    if (action.length === 0 || resolving || onCooldown) return;
    setRollActive(true);
    void solo.act(action);
    setDraft('');
  };

  const hasBoard =
    game.room.entities.length > 0 || game.room.threats.length > 0;

  return (
    <div className="torchlit relative min-h-screen w-full">
      <div className="mx-auto flex min-h-screen w-full max-w-[470px] flex-col">
        <header className="sticky top-0 z-20 border-b border-edge bg-[#0a0705]/95 px-5 pb-3 pt-5 backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onExit}
                className="font-label text-[10px] uppercase tracking-[0.18em] text-faint transition hover:text-ember"
              >
                ‹ Modes
              </button>
              <button
                type="button"
                onClick={onNewRun}
                className="font-label text-[10px] uppercase tracking-[0.18em] text-faint transition hover:text-ember"
              >
                ⟳ New run
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-label text-[10px] uppercase tracking-[0.18em] text-faint">
                Depth {game.party.depth}
              </span>
              <MapButton onClick={() => setMapOpen(true)} />
            </div>
          </div>
          <h1 className="font-display text-[22px] font-bold leading-none text-[#f6b063]">
            {game.party.name}
          </h1>
          <div className="mt-2">
            <HealthBar hp={game.party.hp} maxHp={game.party.maxHp} />
          </div>
          <div className="mt-2">
            <PartyVitals party={game.party} />
          </div>
          <div className="mt-2">
            <StatBlock abilities={game.party.abilities} />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 px-5 py-5">
          {transcript.map((entry) => (
            <TranscriptBeat key={entry.id} entry={entry} />
          ))}

          {hasBoard && (
            <section className="flex flex-col gap-3 rounded-2xl border border-[#2a2018] bg-[#100b08] p-3.5">
              <SceneEntities entities={game.room.entities} />
              <ThreatStrip threats={game.room.threats} />
            </section>
          )}
          <div ref={endRef} />
        </main>

        <footer className="sticky bottom-0 z-20 border-t border-edge bg-[#0a0705]/95 px-5 py-3 backdrop-blur">
          {error && (
            <p className="mb-2 font-body text-[13px] text-[#f0594e]">{error}</p>
          )}
          {onCooldown ? (
            <div className="py-1.5 text-center">
              <p className="font-body text-[13.5px] italic text-muted">
                The dark has spent itself on you. Its strength gathers again.
              </p>
              <div className="mx-auto mt-2.5 flex max-w-[240px] items-center gap-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2a1d12]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#8a5a2e] to-[#f7b061] transition-[width] duration-500"
                    style={{
                      width: `${((COOLDOWN_MS - cooldownLeft) / COOLDOWN_MS) * 100}%`,
                    }}
                  />
                </div>
                <span className="font-label text-[12px] tabular-nums text-ember-glow">
                  {Math.ceil(cooldownLeft / 1000)}s
                </span>
              </div>
            </div>
          ) : (
            <>
              {game.room.suggestions.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {game.room.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => submit(suggestion)}
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
                    if (e.key === 'Enter') submit(draft);
                  }}
                  disabled={resolving}
                  maxLength={300}
                  placeholder="Search the altar, draw a blade, light a torch…"
                  className="flex-1 rounded-xl border border-[#3a302b] bg-[#1a130d] px-3 py-2.5 font-body text-[14px] text-ink outline-none placeholder:italic placeholder:text-faint focus:border-ember disabled:opacity-50"
                />
                <button
                  onClick={() => submit(draft)}
                  disabled={resolving || draft.trim().length === 0}
                  className="rounded-xl bg-ember px-5 py-2.5 font-label text-[13px] font-semibold uppercase tracking-wide text-[#150d06] transition hover:brightness-110 disabled:opacity-40"
                >
                  {resolving ? '…' : 'Act'}
                </button>
              </div>
            </>
          )}
        </footer>
      </div>

      {mapOpen && (
        <MapModal
          map={game.map}
          title="The Descent"
          onClose={() => setMapOpen(false)}
        />
      )}

      {rollActive && (
        <DiceOverlay
          rolling={resolving}
          result={
            !resolving && !error && !onCooldown && game.lastCheck
              ? { die: game.lastCheck.die, outcome: game.lastCheck.outcome }
              : null
          }
          onDone={endRoll}
        />
      )}
    </div>
  );
}
