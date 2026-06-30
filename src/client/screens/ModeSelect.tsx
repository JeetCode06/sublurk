import { useState } from 'react';
import { INSTALL_URL } from '../../shared/api';

// A few drifting embers reused across the torchlit screens.
function Embers() {
  return (
    <>
      <div
        className="ember-dot anim-flick"
        style={{
          top: '-60px',
          left: '50%',
          width: '420px',
          height: '360px',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(circle, rgba(232,137,63,.16), transparent 64%)',
          boxShadow: 'none',
          borderRadius: 0,
        }}
      />
      <div
        className="ember-dot"
        style={{
          left: '9%',
          bottom: '9%',
          width: '5px',
          height: '5px',
          animation: 'ember 6s ease-in infinite',
        }}
      />
      <div
        className="ember-dot"
        style={{
          right: '11%',
          bottom: '15%',
          width: '4px',
          height: '4px',
          background: '#f7c98a',
          animation: 'ember 7.5s ease-in 2s infinite',
        }}
      />
    </>
  );
}

function SoloGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" fill="#1a1006" />
      <path d="M5.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6Z" fill="#1a1006" />
    </svg>
  );
}

function CommunityGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="8" cy="8.5" r="2.7" fill="#05181d" />
      <circle cx="16" cy="8.5" r="2.7" fill="#05181d" />
      <path d="M3 18c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6Z" fill="#05181d" />
      <path
        d="M11 18c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6Z"
        fill="#05181d"
        opacity="0.85"
      />
    </svg>
  );
}

export function ModeSelect({
  onSolo,
  onCommunity,
}: Readonly<{
  onSolo: () => void;
  onCommunity: () => void;
}>) {
  const [showInstall, setShowInstall] = useState(false);

  return (
    <div className="torchlit relative flex min-h-screen justify-center overflow-hidden">
      <Embers />
      <div className="anim-rise relative flex w-full max-w-[470px] flex-col px-5 py-11">
        <header className="text-center">
          <div className="font-label text-[12px] font-semibold uppercase tracking-[0.34em] text-ember">
            Choose your mode
          </div>
          <h1 className="mt-3 font-display text-[30px] font-bold leading-tight text-ink">
            How will you descend?
          </h1>
          <p className="mt-2 font-body text-[15px] italic text-muted">
            Two ways into the dark. Choose your poison.
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-4">
          {/* SOLO — the orange, real-time lane */}
          <button
            type="button"
            onClick={onSolo}
            className="group rounded-2xl border border-[#5a3a1e] bg-[#1d130b] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-ember hover:bg-[#241710] focus:outline-none focus-visible:border-ember"
          >
            <div className="flex items-center gap-3.5">
              <span
                className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(150deg, #f7b061, #d8742a)',
                  boxShadow: '0 0 18px rgba(232,137,63,.28)',
                }}
              >
                <SoloGlyph />
              </span>
              <span className="flex-1">
                <span className="block font-display text-[22px] font-bold leading-none text-[#f6b878]">
                  SOLO
                </span>
                <span className="mt-1 block font-label text-[11px] font-medium uppercase tracking-[0.22em] text-ember">
                  Real-time · 1 player
                </span>
              </span>
            </div>
            <p className="mt-3 font-body text-[13.5px] italic leading-snug text-parchment">
              Just you, your dice, and a dungeon that wants you dead. Type what
              you do — live with what you rolled.
            </p>
            <div className="mt-3.5 flex items-center gap-2.5">
              <span className="text-blood">♥</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#3a1f14]">
                <span
                  className="block h-full w-3/4 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #d8742a, #f7b061)',
                  }}
                />
              </span>
              <span className="rounded-md border border-[#5a3a1e] px-2 py-0.5 font-label text-[11px] tracking-wide text-ember-glow">
                ⚄ 2d6
              </span>
            </div>
          </button>

          {/* COMMUNITY — the teal, vote-driven lane */}
          <button
            type="button"
            onClick={onCommunity}
            className="group rounded-2xl border border-[#1d4a55] bg-[#07191e] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-teal hover:bg-[#0a2128] focus:outline-none focus-visible:border-teal"
          >
            <div className="flex items-center gap-3.5">
              <span
                className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(150deg, #7fd6e4, #3aa7bd)',
                  boxShadow: '0 0 18px rgba(92,196,214,.26)',
                }}
              >
                <CommunityGlyph />
              </span>
              <span className="flex-1">
                <span className="block font-display text-[22px] font-bold leading-none text-teal-bright">
                  COMMUNITY
                </span>
                <span className="mt-1 block font-label text-[11px] font-medium uppercase tracking-[0.22em] text-teal">
                  Async · whole sub
                </span>
              </span>
            </div>
            <p className="mt-3 font-body text-[13.5px] italic leading-snug text-[#b6c9cc]">
              The entire subreddit pilots one hero. Comment your move, upvote
              the best, watch the top action resolve.
            </p>
            <div className="mt-3.5 flex items-center gap-2">
              <span className="font-label text-[11px] uppercase tracking-[0.18em] text-teal">
                ▲ vote
              </span>
              <span className="flex flex-1 items-end gap-1">
                {[6, 10, 7, 12, 5].map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-sm bg-[#1d4a55]"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </span>
              <span className="rounded-md border border-[#1d4a55] px-2 py-0.5 font-label text-[11px] tracking-wide text-[#9fe0ec]">
                ⌁ comments
              </span>
            </div>
          </button>
        </div>

        <div className="mt-7">
          <button
            type="button"
            onClick={() => setShowInstall((open) => !open)}
            className="mx-auto block font-label text-[11px] uppercase tracking-[0.2em] text-faint transition hover:text-muted"
          >
            Bring it to your community →
          </button>
          {showInstall && (
            <div className="anim-rise mt-4 rounded-2xl border border-[#2f2722] bg-[#130d0a] p-4 text-left">
              <p className="font-body text-[14px] leading-relaxed text-parchment">
                Hivemind Crawl forges its world from whatever subreddit it lives
                in. Add it to a community you moderate and it builds a brand-new
                dungeon from that sub.
              </p>
              <ol className="mt-3 flex flex-col gap-1.5 font-body text-[13px] leading-snug text-muted">
                <li>
                  <span className="text-ember">1.</span> Open the app page on
                  Reddit&apos;s Developer Platform.
                </li>
                <li>
                  <span className="text-ember">2.</span> Click{' '}
                  <span className="text-ink">+ Add to Community</span> and grant
                  permissions.
                </li>
                <li>
                  <span className="text-ember">3.</span> Pick a subreddit you
                  fully moderate — done.
                </li>
              </ol>
              <a
                href={INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center rounded-lg bg-ember px-4 py-2.5 font-label text-[13px] font-medium uppercase tracking-wide text-[#1a1006] transition hover:bg-ember-bright"
              >
                Open the app page ↗
              </a>
              <p className="mt-2 text-center font-body text-[11px] text-faint">
                Installing apps is limited to subreddit moderators.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
