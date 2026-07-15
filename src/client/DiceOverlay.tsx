import { useEffect, useState } from 'react';
import type { Outcome } from '../shared/game';

const DIE_FACES = 20;
const CYCLE_MS = 70;
const HOLD_MS = 950;
const FADE_MS = 320;

type Landed = { die: number; outcome: Outcome };

function outcomeText(die: number, outcome: Outcome): string {
  if (die === DIE_FACES) return 'Critical Success';
  if (die === 1) return 'Critical Failure';
  if (outcome === 'success') return 'Success';
  if (outcome === 'partial') return 'Partial';
  return 'Failure';
}

function outcomeColor(die: number, outcome: Outcome): string {
  if (die === DIE_FACES) return '#f7d36a';
  if (die === 1) return '#f0594e';
  if (outcome === 'success') return '#e8c15a';
  if (outcome === 'partial') return '#f6b063';
  return '#f0594e';
}

function dieGlow(result: Landed | null): string {
  if (result) {
    if (result.die === DIE_FACES)
      return 'drop-shadow(0 0 22px rgba(247,211,106,0.7))';
    if (result.die === 1) return 'drop-shadow(0 0 20px rgba(240,89,78,0.6))';
    return 'drop-shadow(0 0 16px rgba(247,176,97,0.5))';
  }
  return 'drop-shadow(0 0 14px rgba(247,176,97,0.4))';
}

// The full-screen die that plays while an action resolves. It tumbles through
// random faces until the turn returns, lands on the real roll, flashes the
// outcome, and fades. Because the roll is decided server-side, this also fills
// the wait so the turn never feels like dead air. The overlay is only mounted
// once a turn is in flight, so a lingering previous roll can't leak through.
export function DiceOverlay({
  rolling,
  result,
  onDone,
}: Readonly<{
  rolling: boolean;
  result: Landed | null;
  onDone: () => void;
}>) {
  const [face, setFace] = useState(1);
  const [leaving, setLeaving] = useState(false);

  // Spin through faces while the turn is in flight.
  useEffect(() => {
    if (!rolling) return;
    const id = setInterval(
      () => setFace(1 + Math.floor(Math.random() * DIE_FACES)),
      CYCLE_MS
    );
    return () => clearInterval(id);
  }, [rolling]);

  // Once the turn resolves, hold on the result then leave — or dismiss at once
  // if it failed with no roll.
  useEffect(() => {
    if (rolling) return;
    if (!result) {
      onDone();
      return;
    }
    const id = setTimeout(() => setLeaving(true), HOLD_MS);
    return () => clearTimeout(id);
  }, [rolling, result, onDone]);

  // Fade, then tear down.
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(id);
  }, [leaving, onDone]);

  const landed = !rolling && result !== null;
  const shownFace = landed && result ? result.die : face;
  const label = landed && result ? outcomeText(result.die, result.outcome) : '';
  const color =
    landed && result ? outcomeColor(result.die, result.outcome) : '#f6b063';

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-[#0a0705]/85 backdrop-blur-sm transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      <div
        className={landed ? 'dice-landed' : 'dice-tumbling'}
        style={{ filter: dieGlow(landed ? result : null) }}
      >
        <svg
          viewBox="0 0 100 100"
          width="132"
          height="132"
          aria-hidden="true"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <polygon
            points="50,4 89.8,27 89.8,73 50,96 10.2,73 10.2,27"
            fill="#1b0d0b"
            stroke="#cf4a38"
            strokeWidth="2.5"
          />
          <g stroke="#8f2f26" strokeWidth="1.2" opacity="0.85">
            <line x1="50" y1="26" x2="50" y2="4" />
            <line x1="50" y1="26" x2="10.2" y2="27" />
            <line x1="50" y1="26" x2="89.8" y2="27" />
            <line x1="28" y1="62" x2="10.2" y2="73" />
            <line x1="28" y1="62" x2="50" y2="96" />
            <line x1="72" y1="62" x2="89.8" y2="73" />
            <line x1="72" y1="62" x2="50" y2="96" />
          </g>
          <polygon
            points="50,26 72,62 28,62"
            fill="#221010"
            stroke="#a13327"
            strokeWidth="1.5"
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Spectral SC', serif"
            fontSize="28"
            fontWeight={700}
            fill="#ecdcc4"
          >
            {shownFace}
          </text>
        </svg>
      </div>
      <div
        className="font-display text-[20px] font-bold tracking-[0.06em] transition-opacity duration-200"
        style={{ color, opacity: landed ? 1 : 0 }}
        role="status"
        aria-live="polite"
      >
        {label}
      </div>
    </div>
  );
}
