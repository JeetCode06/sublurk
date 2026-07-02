import { Embers } from '../Embers';

const TRUTHS = [
  {
    title: 'The screen has you',
    body: 'One tap pulled you through, into a dungeon shaped from this very community. The only way back to your feed is down — all the way to the bottom.',
  },
  {
    title: 'Say what you do',
    body: 'No menus, no buttons. Speak your move — anything at all — and the dungeon answers in kind.',
  },
  {
    title: 'The dice decide',
    body: 'Every move is a roll against the odds. The dice say how well it lands; the dungeon says what it costs.',
  },
  {
    title: 'Death is forever',
    body: 'Fall, and the dungeon keeps you. Your depth is the only mark you leave — a warning for the next fool who taps the button.',
  },
];

const NUMERALS = ['I', 'II', 'III', 'IV'];

export function IntroScreen({ onEnter }: Readonly<{ onEnter: () => void }>) {
  return (
    <div className="torchlit relative min-h-screen w-full overflow-x-hidden">
      <Embers />
      <div className="anim-rise relative mx-auto flex w-full max-w-[470px] flex-col px-5 py-10">
        <header className="text-center">
          <div className="font-label text-[12px] font-semibold uppercase tracking-[0.34em] text-ember">
            Before you descend
          </div>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight text-ink">
            Four truths, then the dark
          </h1>
        </header>

        <ol className="mt-7 flex flex-col gap-3">
          {TRUTHS.map((truth, i) => (
            <li
              key={truth.title}
              className="flex gap-4 rounded-2xl border border-[#2a2118] bg-[#140f0b] p-4"
            >
              <span className="mt-0.5 w-7 shrink-0 text-center font-display text-[24px] font-bold leading-none text-[#d8894a]">
                {NUMERALS[i]}
              </span>
              <span className="flex-1">
                <span className="block font-display text-[17px] font-semibold text-ink">
                  {truth.title}
                </span>
                <span className="mt-1 block font-body text-[13.5px] italic leading-snug text-muted">
                  {truth.body}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onEnter}
          className="mt-7 flex h-12 items-center justify-center rounded-full bg-ember px-8 font-label text-[14px] font-semibold uppercase tracking-[0.14em] text-[#1a1006] transition hover:brightness-110"
          style={{ boxShadow: '0 0 24px rgba(232,137,63,.32)' }}
        >
          Begin the descent →
        </button>
      </div>
    </div>
  );
}
