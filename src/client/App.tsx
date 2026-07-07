import { useState } from 'react';
import { useGame, useSolo } from './hooks/useGame';
import { Board } from './screens/Board';
import { CharacterSelect } from './screens/CharacterSelect';
import { IntroScreen } from './screens/IntroScreen';
import { ModeSelect } from './screens/ModeSelect';
import { InstallScreen } from './screens/InstallScreen';
import { SoloPlay } from './screens/SoloPlay';

export const SOLO_DEFAULT_CLASS = 'adventurer';

export type View =
  | 'intro'
  | 'mode_select'
  | 'character_select'
  | 'install'
  | 'play';
export type Mode = 'solo' | 'community';

const INTRO_SEEN_KEY = 'hivemind:intro-seen';

// Whether this visitor has already seen the how-it-works intro. Storage can be
// unavailable in some embedded contexts, so any failure is treated as "not
// seen" — at worst the intro shows again, which is harmless.
function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // Ignore: the intro will simply show again next time.
  }
}

export const App = () => {
  const [view, setView] = useState<View>(() =>
    introSeen() ? 'mode_select' : 'intro'
  );
  const [mode, setMode] = useState<Mode | null>(null);
  const [soloClass, setSoloClass] = useState<string>(SOLO_DEFAULT_CLASS);
  const community = useGame();
  const solo = useSolo();

  if (view === 'intro') {
    return (
      <IntroScreen
        onEnter={() => {
          markIntroSeen();
          setView('mode_select');
        }}
      />
    );
  }

  if (view === 'mode_select') {
    return (
      <ModeSelect
        onBack={() => setView('intro')}
        onSolo={() => {
          setMode('solo');
          setView('play');
        }}
        onInstall={() => setView('install')}
      />
    );
  }

  if (view === 'install') {
    return <InstallScreen onBack={() => setView('mode_select')} />;
  }

  // Reached from within a run via New run: a run already exists, so the back
  // button returns to it and beginning a new one warns before overwriting it.
  if (view === 'character_select') {
    return (
      <CharacterSelect
        hasActiveRun={!!solo.game}
        onBack={() => setView('play')}
        onBegin={(classId) => {
          setSoloClass(classId);
          void solo.start(classId);
          setView('play');
        }}
      />
    );
  }

  if (mode === 'solo') {
    // Still checking for a saved run to resume.
    if (solo.loading && !solo.game) {
      return (
        <div className="torchlit flex min-h-screen items-center justify-center px-6 text-center font-body text-[15px] italic text-muted">
          Down into the dark…
        </div>
      );
    }
    // No run to resume: choose who falls before the descent begins.
    if (!solo.game) {
      return (
        <CharacterSelect
          hasActiveRun={false}
          onBack={() => {
            setMode(null);
            setView('mode_select');
          }}
          onBegin={(classId) => {
            setSoloClass(classId);
            void solo.start(classId);
          }}
        />
      );
    }
    return (
      <SoloPlay
        solo={solo}
        classId={soloClass}
        onExit={() => {
          setMode(null);
          setView('mode_select');
        }}
        onNewRun={() => setView('character_select')}
      />
    );
  }

  if (community.loading) {
    return (
      <div className="torchlit flex min-h-screen items-center justify-center px-6 text-center font-body text-[15px] italic text-muted">
        Lighting the torches…
      </div>
    );
  }

  if (!community.game) {
    return (
      <div className="torchlit flex min-h-screen items-center justify-center px-6 text-center font-body text-[15px] italic text-parchment">
        <p>
          {community.error ?? 'The dungeon is sealed. Reload to try again.'}
        </p>
      </div>
    );
  }

  return (
    <Board
      game={community.game}
      resolving={community.resolving}
      error={community.error}
      note={community.note}
      proposals={community.proposals}
      serverOffset={community.serverOffset}
      leaderboard={community.leaderboard}
      onResolveVotes={community.resolveVotes}
      onRestart={community.restart}
    />
  );
};
