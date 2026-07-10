import { useEffect, useState } from 'react';
import { useGame, useSolo } from './hooks/useGame';
import { Board } from './screens/Board';
import { CharacterSelect } from './screens/CharacterSelect';
import { IntroScreen } from './screens/IntroScreen';
import { ModeSelect } from './screens/ModeSelect';
import { InstallScreen } from './screens/InstallScreen';
import { SoloPlay } from './screens/SoloPlay';
import { CommunityIntro } from './screens/CommunityIntro';

export const SOLO_DEFAULT_CLASS = 'adventurer';

export type View =
  | 'intro'
  | 'mode_select'
  | 'character_select'
  | 'install'
  | 'play';

type PostKind = 'community' | 'solo';

const INTRO_SEEN_KEY = 'hivemind:intro-seen';
const COMMUNITY_INTRO_SEEN_KEY = 'hivemind:community-intro-seen';

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

// Whether this visitor has seen the community briefing. Same storage caveat as
// the solo intro: any failure just shows it again, which is harmless.
function communityIntroSeen(): boolean {
  try {
    return localStorage.getItem(COMMUNITY_INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markCommunityIntroSeen(): void {
  try {
    localStorage.setItem(COMMUNITY_INTRO_SEEN_KEY, '1');
  } catch {
    // Ignore: the briefing will simply show again next time.
  }
}

function Loader({ text }: Readonly<{ text: string }>) {
  return (
    <div className="torchlit flex min-h-screen items-center justify-center px-6 text-center font-body text-[15px] italic text-muted">
      {text}
    </div>
  );
}

export const App = () => {
  const [postKind, setPostKind] = useState<PostKind | null>(null);
  const [isMod, setIsMod] = useState(false);
  const [showCommunityIntro, setShowCommunityIntro] = useState(
    () => !communityIntroSeen()
  );
  const [view, setView] = useState<View>(() =>
    introSeen() ? 'mode_select' : 'intro'
  );
  const community = useGame(postKind === 'community');
  const solo = useSolo();

  // Discover what kind of post this is: a community post opens straight to the
  // shared board, a discovery post starts the solo flow.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch('/api/context');
        const data = (await res.json()) as { kind?: unknown; isMod?: unknown };
        if (active) {
          setPostKind(data.kind === 'community' ? 'community' : 'solo');
          setIsMod(data.isMod === true);
        }
      } catch {
        if (active) setPostKind('solo');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Still resolving what kind of post this is.
  if (postKind === null) {
    return <Loader text="Lighting the torches…" />;
  }

  // A community post is the shared board, full stop.
  if (postKind === 'community') {
    // First-time visitors get the Warden's community briefing; it can be
    // reopened from the board via "How it works".
    if (showCommunityIntro) {
      return (
        <CommunityIntro
          onEnter={() => {
            markCommunityIntroSeen();
            setShowCommunityIntro(false);
          }}
        />
      );
    }
    if (community.loading) return <Loader text="Lighting the torches…" />;
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
        isMod={isMod}
        onHowItWorks={() => setShowCommunityIntro(true)}
      />
    );
  }

  // Otherwise, the solo discovery flow.
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

  if (view === 'install') {
    return <InstallScreen onBack={() => setView('mode_select')} />;
  }

  // New run from within a run: a run exists, so back returns to it and beginning
  // a new one warns before overwriting it.
  if (view === 'character_select') {
    return (
      <CharacterSelect
        hasActiveRun={solo.game?.phase === 'awaiting_actions'}
        onBack={() => setView('play')}
        onBegin={(classId) => {
          void solo.start(classId);
          setView('play');
        }}
      />
    );
  }

  if (view === 'play') {
    // Still checking for a saved run to resume.
    if (solo.loading && !solo.game) {
      return <Loader text="Down into the dark…" />;
    }
    // No run to resume: choose who falls before the descent begins.
    if (!solo.game) {
      return (
        <CharacterSelect
          hasActiveRun={false}
          onBack={() => setView('mode_select')}
          onBegin={(classId) => {
            void solo.start(classId);
          }}
        />
      );
    }
    return (
      <SoloPlay
        solo={solo}
        onExit={() => setView('mode_select')}
        onNewRun={() => setView('character_select')}
      />
    );
  }

  // Default: the mode select.
  return (
    <ModeSelect
      onBack={() => setView('intro')}
      onSolo={() => setView('play')}
      onInstall={() => setView('install')}
    />
  );
};
