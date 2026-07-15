import { useEffect, useState } from 'react';
import type { ClassId } from '../../shared/game';
import { CLASS_INFO, classAffinitySummary } from '../../shared/classes';
import type { ClassNamesResponse, ErrorResponse } from '../../shared/api';
import { TorchlitScreen } from '../Embers';
import {
  ABILITY_ORDER,
  ABILITY_SHORT,
  abilityMod,
  abilityModColor,
  signed,
} from '../lib';

// The three crawlers offered on the character screen. The data layer knows other
// classes, but a tight, distinct roster (a bruiser, a caster, a rogue) reads far
// better than a long shelf of similar ones.
const CLASS_ORDER: ClassId[] = ['warrior', 'witch', 'trickster'];

const CLASS_ROLE: Record<ClassId, string> = {
  warrior: 'Bruiser',
  witch: 'Cannon',
  healer: 'Support',
  trickster: 'Sneak',
  adventurer: 'Wildcard',
};

// Each class carries a firelit accent so it reads as its own thing: a main hue,
// a lighter shade for text and icon gradients, a dim border, and a tinted dark
// panel.
type Accent = { main: string; light: string; dim: string; bg: string };
const CLASS_ACCENT: Record<ClassId, Accent> = {
  warrior: { main: '#e8893f', light: '#f6b063', dim: '#5a3a1e', bg: '#1d130b' },
  witch: { main: '#5cc4d6', light: '#7fd6e4', dim: '#1d4a55', bg: '#07191e' },
  healer: { main: '#e8c15a', light: '#f3d488', dim: '#5a4a1e', bg: '#1c160a' },
  trickster: {
    main: '#9ccb55',
    light: '#bce07a',
    dim: '#3a5520',
    bg: '#121a0a',
  },
  adventurer: {
    main: '#b08fd0',
    light: '#caa8e8',
    dim: '#3f2a55',
    bg: '#150f1d',
  },
};

function classSigil(id: ClassId) {
  switch (id) {
    case 'warrior':
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path
            d="M9 9 L23 23 M23 9 L9 23"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'witch':
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <circle
            cx="16"
            cy="16"
            r="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="16" cy="16" r="2.2" fill="currentColor" />
        </svg>
      );
    case 'healer':
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path
            d="M16 7 V25 M7 16 H25"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'trickster':
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <circle
            cx="16"
            cy="11"
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16 15 V25 M16 21 H21 M16 24 H20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'adventurer':
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path
            d="M16 5 L19 13 L27 16 L19 19 L16 27 L13 19 L5 16 L13 13 Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

export function CharacterSelect({
  onBack,
  onBegin,
  hasActiveRun,
}: Readonly<{
  onBack: () => void;
  onBegin: (classId: string) => void;
  hasActiveRun: boolean;
}>) {
  const [selected, setSelected] = useState<ClassId>('warrior');
  const [themed, setThemed] = useState<Record<ClassId, string> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const klass = CLASS_INFO[selected];
  const accent = CLASS_ACCENT[selected];
  const { strong, weak } = classAffinitySummary(selected);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch('/api/classes');
        const data = (await res.json()) as ClassNamesResponse | ErrorResponse;
        if (active && 'type' in data) setThemed(data.names);
      } catch {
        // Keep the base archetype names if themed names can't be loaded.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedName = themed?.[selected] ?? klass.name;
  // Highlight a class's defining stat — the single highest score. The Wanderer's
  // scores are all equal, so nothing lights up, which reads as "no specialty".
  const scores = ABILITY_ORDER.map((a) => klass.abilities[a]);
  const peak = Math.max(...scores);
  const hasPeak = peak > Math.min(...scores);

  return (
    <TorchlitScreen>
      <header className="text-center">
        <div className="font-label text-[12px] font-semibold tracking-[0.06em] text-ember">
          Pick 1 of {CLASS_ORDER.length}
        </div>
        <h1 className="mt-3 font-display text-[28px] font-bold leading-tight text-ink">
          Choose your crawler
        </h1>
        <p className="mt-2 font-body text-[15px] italic text-muted">
          The fools volunteered. Pick the one you&apos;ll mourn.
        </p>
      </header>

      {/* Class picker — three crawlers, no scrolling. */}
      <div className="mt-7 grid grid-cols-3 gap-2.5">
        {CLASS_ORDER.map((id) => {
          const info = CLASS_INFO[id];
          const display = themed?.[id] ?? info.name;
          const a = CLASS_ACCENT[id];
          const isSelected = id === selected;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className="flex flex-col items-center gap-2 rounded-none border p-3 text-center transition duration-200"
              style={{
                borderColor: isSelected ? a.main : '#2c241e',
                background: isSelected ? a.bg : '#161009',
              }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-none"
                style={{
                  color: isSelected ? a.light : '#6f6358',
                  background: isSelected ? 'rgba(0,0,0,0.25)' : '#1d160f',
                }}
              >
                {classSigil(id)}
              </span>
              <span
                className="block w-full truncate font-display text-[13px] font-semibold leading-none"
                style={{ color: isSelected ? a.light : '#9a8a7a' }}
              >
                {display}
              </span>
              <span className="font-label text-[9.5px] tracking-[0.06em] text-faint">
                {CLASS_ROLE[id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected crawler dossier */}
      <div
        className="anim-pop mt-4 rounded-none border p-4"
        style={{ borderColor: accent.dim, background: accent.bg }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none"
            style={{
              color: '#150d06',
              background: accent.main,
            }}
          >
            {classSigil(selected)}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className="truncate font-display text-[22px] font-bold leading-none"
              style={{ color: accent.light }}
            >
              {selectedName}
            </h2>
            <span
              className="mt-1 inline-block rounded-none px-2 py-0.5 font-label text-[10px] font-medium tracking-[0.06em]"
              style={{
                color: accent.light,
                background: 'rgba(0,0,0,0.28)',
                border: `1px solid ${accent.dim}`,
              }}
            >
              {CLASS_ROLE[selected]}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-6 gap-1.5 text-center">
          {ABILITY_ORDER.map((ability) => {
            const score = klass.abilities[ability];
            const mod = abilityMod(score);
            const isPeak = hasPeak && score === peak;
            return (
              <div
                key={ability}
                className="rounded-none py-1.5"
                style={{
                  background: isPeak ? 'rgba(0,0,0,0.3)' : 'transparent',
                  border: isPeak
                    ? `1px solid ${accent.dim}`
                    : '1px solid transparent',
                }}
              >
                <div className="font-label text-[9px] tracking-[0.06em] text-muted">
                  {ABILITY_SHORT[ability]}
                </div>
                <div
                  className="font-display text-[16px] font-semibold leading-tight"
                  style={{ color: isPeak ? accent.light : '#e8ddc8' }}
                >
                  {score}
                </div>
                <div
                  className={`font-label text-[10px] ${isPeak ? '' : abilityModColor(mod)}`}
                  style={isPeak ? { color: accent.light } : undefined}
                >
                  {signed(mod)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {strong.map((room) => (
            <span
              key={room}
              className="rounded-none px-2.5 py-1 font-label text-[10.5px] tracking-wide"
              style={{
                color: accent.light,
                border: `1px solid ${accent.dim}`,
                background: 'rgba(0,0,0,0.22)',
              }}
            >
              ▲ {room}
            </span>
          ))}
          {weak.map((room) => (
            <span
              key={room}
              className="rounded-none border border-[#6a3a30] bg-[#241312] px-2.5 py-1 font-label text-[10.5px] tracking-wide text-[#d08a78]"
            >
              ▽ {room}
            </span>
          ))}
          {strong.length === 0 && weak.length === 0 && (
            <span className="rounded-none border border-edge bg-[#1a140f] px-2.5 py-1 font-label text-[10.5px] tracking-wide text-muted">
              No weaknesses
            </span>
          )}
        </div>

        <p className="mt-3.5 flex gap-2 font-body text-[13px] italic leading-snug text-parchment">
          <span style={{ color: accent.main }}>✦</span>
          <span>{klass.signature}</span>
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (hasActiveRun) setConfirming(true);
            else onBegin(selected);
          }}
          className="w-full rounded-none px-5 py-3.5 font-label text-[14px] font-semibold tracking-[0.06em] transition hover:brightness-110"
          style={{ background: accent.main, color: '#150d06' }}
        >
          Descend as {selectedName}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="font-label text-[11px] tracking-[0.06em] text-faint transition hover:text-muted"
        >
          {hasActiveRun ? '‹ Back to your run' : '‹ Back to modes'}
        </button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0a0705]/85 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-none border border-edge bg-[#140f0b] p-6">
            <p className="font-body text-[15px] italic leading-relaxed text-parchment">
              A soul already wanders below. Choose another and the first stays
              with me, their descent ended where it stands.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  onBegin(selected);
                }}
                className="w-full rounded-none px-5 py-3 font-label text-[13px] font-semibold tracking-[0.06em] text-[#f2e6d4] transition hover:brightness-110"
                style={{ background: accent.main }}
              >
                Leave them behind
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="font-label text-[11px] tracking-[0.06em] text-faint transition hover:text-muted"
              >
                Never mind
              </button>
            </div>
          </div>
        </div>
      )}
    </TorchlitScreen>
  );
}
