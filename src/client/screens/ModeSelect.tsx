import { useState } from 'react';

// The app's page in Reddit's Developer Platform app directory, where a mod can
// add it to their own community. Update the slug to the published app's URL.
export const INSTALL_URL = 'https://developers.reddit.com/apps/hivemind-crawl';

export function ModeSelect({
  onSolo,
  onCommunity,
}: Readonly<{
  onSolo: () => void;
  onCommunity: () => void;
}>) {
  const [showInstall, setShowInstall] = useState(false);
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1a1614] px-5 py-12 text-[#e8ddc8]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55))]" />
      <div className="relative w-full max-w-md">
        <div className="text-center font-mono text-sm tracking-[0.35em] text-[#b6a08a]">
          HIVEMIND CRAWL
        </div>
        <div className="mx-auto mt-3 flex items-center justify-center gap-2">
          <span className="h-px w-16 bg-[#3a302b]" />
          <span className="h-1.5 w-1.5 rotate-45 border border-[#4a3f38]" />
          <span className="h-px w-16 bg-[#3a302b]" />
        </div>
        <p className="mt-4 text-center text-sm text-[#8a7d72]">
          A dungeon told by many voices. How will you descend?
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <button
            type="button"
            onClick={onSolo}
            className="group flex items-center gap-4 rounded-xl border border-[#3a302b] bg-[#221b17] p-4 text-left transition hover:border-[#e8893f] hover:bg-[#2a211c]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#4a3f38] bg-[#2a211c] text-[#e8893f]">
              <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
                <path
                  d="M16 6c4 5 2 9 0 11-2-2-4-6 0-11Z"
                  fill="currentColor"
                />
                <rect
                  x="15"
                  y="16"
                  width="2"
                  height="9"
                  rx="1"
                  fill="currentColor"
                  opacity="0.7"
                />
              </svg>
            </span>
            <span className="flex-1">
              <span className="block font-medium text-[#f0c050]">
                Play Solo
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-[#a89880]">
                Descend alone, in real time. Every move is yours.
              </span>
            </span>
            <span className="font-mono text-lg text-[#6a5d52] transition group-hover:text-[#e8893f]">
              ›
            </span>
          </button>

          <button
            type="button"
            onClick={onCommunity}
            className="group flex items-center gap-4 rounded-xl border border-[#3a302b] bg-[#221b17] p-4 text-left transition hover:border-[#e8893f] hover:bg-[#2a211c]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#4a3f38] bg-[#2a211c] text-[#e8893f]">
              <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
                <circle cx="16" cy="11" r="3.4" fill="currentColor" />
                <circle cx="10" cy="19" r="3.4" fill="currentColor" />
                <circle cx="22" cy="19" r="3.4" fill="currentColor" />
                <circle
                  cx="16"
                  cy="22"
                  r="3.4"
                  fill="currentColor"
                  opacity="0.55"
                />
              </svg>
            </span>
            <span className="flex-1">
              <span className="block font-medium text-[#f0c050]">
                Community Run
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-[#a89880]">
                The whole subreddit votes each turn. One party, many minds.
              </span>
            </span>
            <span className="font-mono text-lg text-[#6a5d52] transition group-hover:text-[#e8893f]">
              ›
            </span>
          </button>
        </div>

        <div className="mt-7">
          <button
            type="button"
            onClick={() => setShowInstall((open) => !open)}
            className="mx-auto block font-mono text-[11px] tracking-wide text-[#6a5d52] transition hover:text-[#8a7d72]"
          >
            Get Hivemind Crawl on your subreddit →
          </button>
          {showInstall && (
            <div className="mt-4 rounded-xl border border-[#2f2722] bg-[#1b1613] p-4 text-left">
              <p className="text-sm leading-relaxed text-[#c9b896]">
                Hivemind Crawl builds its world from whatever subreddit it lives
                in. Add it to a community you moderate and it forges a brand-new
                dungeon from that sub.
              </p>
              <ol className="mt-3 flex flex-col gap-1.5 text-xs leading-snug text-[#a89880]">
                <li>
                  <span className="text-[#8a7d72]">1.</span> Open the app page
                  on Reddit&apos;s Developer Platform.
                </li>
                <li>
                  <span className="text-[#8a7d72]">2.</span> Click{' '}
                  <span className="text-[#e8ddc8]">+ Add to Community</span> and
                  grant permissions.
                </li>
                <li>
                  <span className="text-[#8a7d72]">3.</span> Pick a subreddit
                  you fully moderate — done.
                </li>
              </ol>
              <a
                href={INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center rounded-lg bg-[#e8893f] px-4 py-2.5 text-sm font-medium text-[#1a1614] transition hover:bg-[#f0a050]"
              >
                Open the app page ↗
              </a>
              <p className="mt-2 break-all text-center font-mono text-[10px] text-[#5a4f47]">
                {INSTALL_URL}
              </p>
              <p className="mt-2 text-center text-[10px] text-[#6a5d52]">
                Installing apps is limited to subreddit moderators.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
