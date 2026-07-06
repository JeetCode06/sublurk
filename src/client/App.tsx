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
        onSolo={() => setView('character_select')}
        onCommunity={() => {
          setMode('community');
          setView('play');
        }}
        onInstall={() => setView('install')}
      />
    );
  }

  if (view === 'install') {
    return <InstallScreen onBack={() => setView('mode_select')} />;
  }

  if (view === 'character_select') {
    return (
      <CharacterSelect
        onBack={() => setView('mode_select')}
        onBegin={(classId) => {
          setSoloClass(classId);
          void solo.start(classId);
          setMode('solo');
          setView('play');
        }}
      />
    );
  }

  if (mode === 'solo') {
    return (
      <SoloPlay
        solo={solo}
        classId={soloClass}
        onExit={() => {
          setMode(null);
          setView('mode_select');
        }}
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
      onAct={community.submitAction}
      onResolveVotes={community.resolveVotes}
      onRestart={community.restart}
    />
  );
};
