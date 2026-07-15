import { TorchlitScreen } from '../Embers';
import { Rule } from '../components';

function SoloGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" fill="#1a1006" />
      <path d="M5.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6Z" fill="#1a1006" />
    </svg>
  );
}

function ModerateGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4 3 6.6 7 8 4-1.4 7-4 7-8V6Z" fill="#05181d" />
    </svg>
  );
}

export function ModeSelect({
  onBack,
  onSolo,
  onInstall,
}: Readonly<{
  onBack: () => void;
  onSolo: () => void;
  onInstall: () => void;
}>) {
  return (
    <TorchlitScreen>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 self-start font-label text-[11px] tracking-[0.06em] text-faint transition hover:text-muted"
      >
        ‹ Back
      </button>
      <header className="text-center">
        <div className="font-label text-[12px] font-semibold tracking-[0.06em] text-rubric-bright">
          Two ways in
        </div>
        <h1 className="mt-3 font-display text-[30px] font-bold leading-tight text-ink">
          How will you play?
        </h1>
        <Rule className="mx-auto mt-3 w-32" />
        <p className="mt-2 font-body text-[15px] text-muted">
          Descend yourself, or bring it to a sub you moderate.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4">
        {/* SOLO — the orange, real-time lane */}
        <button
          type="button"
          onClick={onSolo}
          className="group rounded-none border border-[#5a3a1e] bg-[#1d130b] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-rubric-bright hover:bg-[#241710] focus:outline-none focus-visible:border-rubric-bright"
        >
          <div className="flex items-center gap-3.5">
            <span
              className="flex h-13 w-13 shrink-0 items-center justify-center rounded-none"
              style={{
                background: '#d8742a',
              }}
            >
              <SoloGlyph />
            </span>
            <span className="flex-1">
              <span className="block font-display text-[22px] font-bold leading-none text-[#f6b878]">
                SOLO
              </span>
              <span className="mt-1 block font-label text-[11px] font-medium tracking-[0.06em] text-ember">
                Real-time · 1 player
              </span>
            </span>
          </div>
          <p className="mt-3 font-body text-[13.5px] italic leading-snug text-parchment">
            Just you, your dice, and a dungeon that wants you dead. Type what
            you do, live with what you rolled.
          </p>
          <div className="mt-3.5 flex items-center gap-2.5">
            <span className="text-blood">♥</span>
            <span className="h-2 flex-1 overflow-hidden rounded-none bg-[#3a1f14]">
              <span
                className="block h-full w-3/4 rounded-none"
                style={{
                  background: '#c9762f',
                }}
              />
            </span>
            <span className="rounded-none border border-[#5a3a1e] px-2 py-0.5 font-label text-[11px] tracking-wide text-ember-glow">
              ⚄ d20
            </span>
          </div>
        </button>

        {/* MODERATE — bring it to a community you run */}
        <button
          type="button"
          onClick={onInstall}
          className="group rounded-none border border-[#1d4a55] bg-[#07191e] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-teal hover:bg-[#0a2128] focus:outline-none focus-visible:border-teal"
        >
          <div className="flex items-center gap-3.5">
            <span
              className="flex h-13 w-13 shrink-0 items-center justify-center rounded-none"
              style={{
                background: '#3aa7bd',
              }}
            >
              <ModerateGlyph />
            </span>
            <span className="flex-1">
              <span className="block font-display text-[22px] font-bold leading-none text-teal-bright">
                Moderate a sub?
              </span>
              <span className="mt-1 block font-label text-[11px] font-medium tracking-[0.06em] text-teal">
                Bring it home
              </span>
            </span>
          </div>
          <p className="mt-3 font-body text-[13.5px] italic leading-snug text-[#b6c9cc]">
            Run it in a community you moderate. The dungeon rebuilds itself from
            that sub&apos;s own posts, themed to whatever your people talk
            about.
          </p>
          <div className="mt-3.5 flex items-center gap-2">
            <span className="font-label text-[11px] tracking-[0.06em] text-teal">
              Install →
            </span>
          </div>
        </button>
      </div>

      <p className="mt-8 text-center font-body text-[10.5px] leading-relaxed text-faint">
        Mechanics adapted from the System Reference Document 5.1 by Wizards of
        the Coast LLC, licensed under{' '}
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
    </TorchlitScreen>
  );
}
