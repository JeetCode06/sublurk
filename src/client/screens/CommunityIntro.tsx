import { Embers } from '../Embers';

// The Warden's opening address for a community post. Unlike the solo intro, the
// four things a newcomer must grasp are different: the sub shares one hero, they
// steer by commenting and voting, death is permanent, and the way out is down.
const ADDRESS = [
  'One of you tapped, and the glass gave way. Now a single soul carries all of you into the dark. They call me the Warden, and I keep what the dungeon takes. This one hero is yours together, and the only voice they hear is the sum of yours.',
  'You do not move them yourselves. Say what they should do in the comments, and when the dungeon calls for a choice, the move the most of you want is the one they make. Argue it out. Rally the votes. The hero belongs to the crowd.',
  'When they fall, they stay fallen, and I send the next one down to take their place. The only way back to your feed is down, every floor of it mine, all the way to the bottom where I wait. How deep your sub reaches is the only mark it leaves for the next to try.',
];

export function CommunityIntro({ onEnter }: Readonly<{ onEnter: () => void }>) {
  return (
    <div className="torchlit relative min-h-screen w-full overflow-x-hidden">
      <Embers />
      <div className="anim-rise relative mx-auto flex w-full max-w-[460px] flex-col px-6 py-12">
        <h1 className="font-display text-[26px] font-bold leading-tight text-ink">
          Your whole sub is down here now.
        </h1>

        <div className="mt-6 flex flex-col gap-4 font-body text-[14.5px] italic leading-relaxed text-parchment">
          {ADDRESS.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <p className="mt-6 font-body text-[16px] italic leading-snug text-ember-glow">
          Go on, then. Decide, together, how far you get.
        </p>

        <button
          type="button"
          onClick={onEnter}
          className="mt-8 flex h-12 items-center justify-center rounded-none bg-rubric px-8 font-label text-[14px] font-semibold tracking-[0.06em] text-[#f2e6d4] transition hover:brightness-110"
        >
          To the board →
        </button>
      </div>
    </div>
  );
}
