import './index.css';

import { navigateTo, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Embers } from './Embers';

type Lane = 'loading' | 'solo' | 'community' | 'both';

export const Splash = () => {
  const [lane, setLane] = useState<Lane>('loading');

  // The splash is its own inline entrypoint with no game state, so ask the
  // server which kind of post this is and show only the matching label. If the
  // request can't complete, fall back to showing both.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch('/api/context');
        const data = (await res.json()) as { kind?: unknown };
        if (!active) return;
        setLane(
          data.kind === 'solo' || data.kind === 'community' ? data.kind : 'both'
        );
      } catch {
        if (active) setLane('both');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="torchlit relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <Embers />

      <div className="anim-rise relative flex flex-col items-center gap-4">
        <span className="font-label text-[13px] font-semibold tracking-[0.08em] text-rubric-bright">
          It pulls you in
        </span>

        <h1 className="font-display text-[44px] font-extrabold leading-[0.95] tracking-[0.04em] text-ink">
          SUBLURK
        </h1>
        <svg
          viewBox="0 0 400 6"
          preserveAspectRatio="none"
          className="h-[5px] w-44"
          aria-hidden="true"
        >
          <path d="M0 0 L400 3 L0 6 Z" fill="#a13327" />
        </svg>

        <p className="max-w-[350px] font-body text-[15.5px] italic leading-relaxed text-parchment">
          You tapped, and the glass gave way. The only way back is down, past
          everything the dark keeps here. Descend. Roll. Try not to die.
        </p>

        <button
          className="mt-2 flex h-12 cursor-pointer items-center justify-center rounded-none bg-rubric px-8 font-label text-[14px] font-semibold tracking-[0.06em] text-[#f2e6d4] transition hover:brightness-110"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Enter the dungeon
        </button>

        {/* Fixed height so the loading state doesn't shift the layout. */}
        <div className="mt-1 flex h-4 items-center gap-2.5 font-label text-[10.5px] tracking-[0.06em]">
          {lane === 'both' && (
            <>
              <span className="text-ember">Solo</span>
              <span className="h-1 w-1 rounded-full bg-faint" />
              <span className="text-teal">Community</span>
            </>
          )}
          {lane === 'solo' && <span className="text-ember">Solo run</span>}
          {lane === 'community' && (
            <span className="text-teal">Community run</span>
          )}
        </div>
      </div>

      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 font-body text-[11px] text-faint">
        <span>Mechanics from the D&amp;D SRD 5.1 · </span>
        <button
          className="cursor-pointer underline transition-colors hover:text-muted"
          onClick={() =>
            navigateTo('https://creativecommons.org/licenses/by/4.0/legalcode')
          }
        >
          CC BY 4.0
        </button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
