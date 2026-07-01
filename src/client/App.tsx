import { useState } from 'react';
import { useGame, useSolo } from './hooks/useGame';
import { Board } from './screens/Board';
import { CharacterSelect } from './screens/CharacterSelect';
import { ModeSelect } from './screens/ModeSelect';
import { InstallScreen } from './screens/InstallScreen';
import { SoloPlay } from './screens/SoloPlay';

export const SOLO_DEFAULT_CLASS = 'adventurer';

export type View = 'mode_select' | 'character_select' | 'install' | 'play';
export type Mode = 'solo' | 'community';

export const App = () => {
  const [view, setView] = useState<View>('mode_select');
  const [mode, setMode] = useState<Mode | null>(null);
  const [soloClass, setSoloClass] = useState<string>(SOLO_DEFAULT_CLASS);
  const community = useGame();
  const solo = useSolo();

  if (view === 'mode_select') {
    return (
      <ModeSelect
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
      <div className="flex min-h-screen items-center justify-center bg-[#1a1614] font-mono text-sm text-[#8a7d72]">
        Lighting the torches…
      </div>
    );
  }

  if (!community.game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1614] px-6 text-center text-[#e8ddc8]">
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
