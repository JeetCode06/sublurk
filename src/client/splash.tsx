import './index.css';

import { navigateTo, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-6 bg-[#1a1614] px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-bold tracking-wide text-[#e8893f]">
          Hivemind Crawl
        </h1>
        <p className="max-w-sm text-base leading-relaxed text-[#8a7d72]">
          A subreddit plays one D&amp;D party. Propose a move, vote in the
          comments, and survive the dungeon together.
        </p>
      </div>

      <button
        className="flex items-center justify-center h-11 px-6 rounded-full font-semibold text-[#1a1614] bg-[#e8893f] cursor-pointer transition-colors hover:bg-[#f0a25c]"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Enter the Dungeon
      </button>

      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[0.72em] text-[#6b6058]">
        <span>Mechanics from the D&amp;D SRD 5.1 · </span>
        <button
          className="cursor-pointer underline hover:text-[#8a7d72] transition-colors"
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
