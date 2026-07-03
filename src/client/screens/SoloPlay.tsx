import { useCallback, useEffect, useRef, useState } from 'react';
import type { Outcome } from '../../shared/game';
import { useSolo, type TranscriptEntry } from '../hooks/useGame';
import {
  CampaignMap,
  HealthBar,
  SceneEntities,
  StatBlock,
  ThreatStrip,
} from '../components';
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
            <span aria-hidden="true">⚄</span> {entry.roll.total} ·{' '}
            {OUTCOME_LABEL[entry.outcome]}
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
  classId,
  onExit,
}: Readonly<{
  solo: ReturnType<typeof useSolo>;
  classId: string;
  onExit: () => void;
}>) {
  const [draft, setDraft] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [rollActive, setRollActive] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { game, loading, resolving, error, transcript } = solo;

  const endRoll = useCallback(() => setRollActive(false), []);

  // Keep the newest beat and the input in view as the story grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript.length]);

  if (loading || !game) {
    return (
      <div className="torchlit flex min-h-screen items-center justify-center px-6 text-center font-body text-[15px] italic text-muted">
        {loading ? 'Pulling you under…' : (error ?? 'No solo run yet.')}
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

  const submit = () => {
    const action = draft.trim();
    if (action.length === 0 || resolving) return;
    setRollActive(true);
    void solo.act(action);
    setDraft('');
  };

  const depthLabel =
    game.party.depth === 0 ? 'The Threshold' : `Depth ${game.party.depth}`;
  const hasBoard =
    game.room.entities.length > 0 || game.room.threats.length > 0;

  return (
    <div className="torchlit relative min-h-screen w-full">
      <div className="mx-auto flex min-h-screen w-full max-w-[470px] flex-col">
        <header className="sticky top-0 z-20 border-b border-edge bg-[#0a0705]/95 px-5 pb-3 pt-5 backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExit}
              className="font-label text-[10px] uppercase tracking-[0.18em] text-faint transition hover:text-ember"
            >
              ‹ Modes
            </button>
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#5a3a1e] bg-[#1d130b] px-2.5 py-1 font-label text-[11px] uppercase tracking-[0.12em] text-ember-glow transition hover:brightness-110"
            >
              <span aria-hidden="true">⚑</span> {depthLabel}
            </button>
          </div>
          <h1 className="font-display text-[22px] font-bold leading-none text-[#f6b063]">
            {game.party.name}
          </h1>
          <div className="mt-2">
            <HealthBar hp={game.party.hp} maxHp={game.party.maxHp} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-label text-[12px] text-muted">
            <span>◈ {game.party.gold} embers</span>
            {game.party.inventory.length > 0 && (
              <span>⚸ {game.party.inventory.join(', ')}</span>
            )}
            {game.party.conditions.length > 0 && (
              <span className="capitalize text-[#f0594e]">
                {game.party.conditions.join(', ')}
              </span>
            )}
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
              <p className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                In the room
              </p>
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
          {game.room.suggestions.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
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
        </footer>
      </div>

      {mapOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0705]/90 p-6"
          onClick={() => setMapOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-2xl border border-[#2a2118] bg-[#120d09] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-[16px] font-semibold text-ember">
                The Descent
              </span>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                className="font-label text-[11px] uppercase tracking-wide text-faint transition hover:text-ember"
              >
                Close
              </button>
            </div>
            <CampaignMap map={game.map} />
          </div>
        </div>
      )}

      {rollActive && (
        <DiceOverlay
          rolling={resolving}
          result={
            !resolving && !error && game.lastCheck
              ? { die: game.lastCheck.die, outcome: game.lastCheck.outcome }
              : null
          }
          onDone={endRoll}
        />
      )}
    </div>
  );
}
