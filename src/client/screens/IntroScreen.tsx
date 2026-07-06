import { Embers } from '../Embers';

// The Warden's opening address. The four things a player must know — that they're
// trapped, that they act in free text, that dice decide, and that death is
// permanent — are woven into one voice rather than listed, so the first screen
// already sounds like the dungeon that narrates the rest of the run.
const ADDRESS = [
  'Now you are here, inside me. I am the Warden — I keep what the screen takes, and it has taken so many before you. The only door is the one you fell through, and it is already shut.',
  'Say what you do — anything at all — and I will answer. But wanting is not doing: every move is a wager against the dark, the dice decide how it lands, and I decide what it costs.',
  'The only way back to your feed is down — all the way to the bottom, past the thing that runs this place. Fall short, and you are mine to keep. How deep you reach is the only mark you leave: a warning for the next fool who taps.',
];

export function IntroScreen({ onEnter }: Readonly<{ onEnter: () => void }>) {
  return (
    <div className="torchlit relative min-h-screen w-full overflow-x-hidden">
      <Embers />
      <div className="anim-rise relative mx-auto flex w-full max-w-[460px] flex-col px-6 py-12">
        <div className="font-label text-[12px] font-semibold uppercase tracking-[0.34em] text-ember">
          The screen has you
        </div>
        <h1 className="mt-4 font-display text-[26px] font-bold leading-tight text-ink">
          You tapped, and the glass gave way.
        </h1>

        <div className="mt-6 flex flex-col gap-4 font-body text-[14.5px] italic leading-relaxed text-parchment">
          {ADDRESS.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <p className="mt-6 font-body text-[16px] italic leading-snug text-ember-glow">
          Come, little mote. Let us see how far you get.
        </p>

        <button
          type="button"
          onClick={onEnter}
          className="mt-8 flex h-12 items-center justify-center rounded-full bg-ember px-8 font-label text-[14px] font-semibold uppercase tracking-[0.16em] text-[#1a1006] transition hover:brightness-110"
          style={{ boxShadow: '0 0 24px rgba(232,137,63,.32)' }}
        >
          Descend →
        </button>
      </div>
    </div>
  );
}
