import './index.css';

import { navigateTo, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Embers } from './Embers';

export const Splash = () => {
  return (
    <div className="torchlit relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <Embers />

      <div className="anim-rise relative flex flex-col items-center gap-4">
        <span className="inline-flex items-center rounded-full border border-[#5a3a1e] bg-[#1d130b] px-3.5 py-1 font-label text-[11px] font-semibold uppercase tracking-[0.3em] text-ember">
          It pulls you in
        </span>

        <h1
          className="font-display text-[46px] font-black leading-[0.92] tracking-[0.03em] text-[#f7b061]"
          style={{ textShadow: '0 0 34px rgba(247,176,97,.34)' }}
        >
          HIVEMIND
          <br />
          CRAWL
        </h1>

        <p className="max-w-[350px] font-body text-[15.5px] italic leading-relaxed text-parchment">
          One tap, and the screen has you. The only way back is down — through a
          dungeon that knows your name. Descend. Roll. Try not to die.
        </p>

        <button
          className="mt-2 flex h-12 cursor-pointer items-center justify-center rounded-full bg-ember px-8 font-label text-[14px] font-semibold uppercase tracking-[0.14em] text-[#1a1006] transition hover:brightness-110"
          style={{ boxShadow: '0 0 26px rgba(232,137,63,.4)' }}
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Enter the dungeon
        </button>

        <div className="mt-1 flex items-center gap-2.5 font-label text-[10.5px] uppercase tracking-[0.24em]">
          <span className="text-ember">Solo</span>
          <span className="h-1 w-1 rounded-full bg-faint" />
          <span className="text-teal">Community</span>
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
