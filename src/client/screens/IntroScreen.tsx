import { Embers } from '../Embers';

// The Warden's opening address. The four things a new player must know (they are
// trapped, they act in plain words, dice decide, death is permanent) are woven
// into one plain-spoken voice rather than listed, so the first screen already
// sounds like the dungeon that narrates the rest of the run.
const ADDRESS = [
  'You are in the dungeon now. So am I. They call me the Warden, and I keep what the dungeon takes. It has taken more than you could count. The way you came in is already gone, and there is no door behind you.',
  'There are no buttons down here. Say what you do, in your own words, and the dungeon answers. But saying a thing is not doing it. Every move is a roll of the dice, and I decide what it costs you.',
  'The only way back to your feed is down. Every floor below this one is mine, and I have filled them with things that want to keep you. Reach the bottom and you walk free. Fall before then, and you belong to me. All that is left of you will be how far you got, scratched into the wall for the next one who taps.',
];

export function IntroScreen({ onEnter }: Readonly<{ onEnter: () => void }>) {
  return (
    <div className="torchlit relative min-h-screen w-full overflow-x-hidden">
      <Embers />
      <div className="anim-rise relative mx-auto flex w-full max-w-[460px] flex-col px-6 py-12">
        <h1 className="font-display text-[26px] font-bold leading-tight text-ink">
          You tapped, and the glass gave way.
        </h1>

        <div className="mt-6 flex flex-col gap-4 font-body text-[14.5px] italic leading-relaxed text-parchment">
          {ADDRESS.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <p className="mt-6 font-body text-[16px] italic leading-snug text-ember-glow">
          Come on, then. Let&rsquo;s see how far you get.
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
