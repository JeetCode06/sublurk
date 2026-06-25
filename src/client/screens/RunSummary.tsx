import type { GameState, LeaderboardEntry } from '../../shared/game';
import { Leaderboard } from '../components';

function villainMark(color: string) {
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill={color} opacity="0.05" />
      <circle cx="60" cy="60" r="42" fill={color} opacity="0.07" />
      <circle cx="60" cy="60" r="30" fill={color} opacity="0.09" />
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="#16110e"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.55"
      />
      <circle
        cx="60"
        cy="60"
        r="44"
        fill="none"
        stroke={color}
        strokeWidth="0.75"
        opacity="0.3"
      />
      <path
        d="M60 28 C47 28 39 40 39 55 C39 68 45 80 60 90 C75 80 81 68 81 55 C81 40 73 28 60 28 Z"
        fill="#0c0a09"
        stroke={color}
        strokeWidth="1"
        opacity="0.85"
      />
      <path
        d="M60 42 C52 42 48 50 48 58 C48 67 54 76 60 80 C66 76 72 67 72 58 C72 50 68 42 60 42 Z"
        fill="#000"
        opacity="0.55"
      />
      <circle cx="54" cy="58" r="2.6" fill={color} />
      <circle cx="66" cy="58" r="2.6" fill={color} />
    </svg>
  );
}

export function RunSummary({
  game,
  restarting,
  onRestart,
  onExit,
  leaderboard,
  currentRun,
}: Readonly<{
  game: GameState;
  restarting: boolean;
  onRestart: () => void;
  onExit?: () => void;
  leaderboard?: LeaderboardEntry[];
  currentRun?: number;
}>) {
  const won = game.phase === 'won';
  const color = won ? '#f0c050' : '#c0392b';
  const accentText = won ? 'text-[#f0c050]' : 'text-[#c0392b]';
  const boss = game.map.finalBoss.name;
  // The closing narration, used as the quote on a first run; from the second run
  // on, the nemesis's remembered taunt takes its place.
  const finalLine =
    game.recentEvents.at(-1) ??
    (won
      ? 'The last blow lands true, and the long dark lifts at last.'
      : 'The party falls, and the dungeon goes silent around them.');
  const quote = game.nemesisLine.length > 0 ? game.nemesisLine : finalLine;
  const cleared = game.map.nodes.filter((node) => node.cleared).length;
  const stats = [
    { label: 'Depth', value: String(game.party.depth) },
    { label: 'Cleared', value: `${cleared}/${game.map.nodes.length}` },
    { label: 'Gold', value: String(game.party.gold) },
    { label: 'Run', value: String(game.runNumber) },
  ];

  let restartLabel: string;
  if (restarting) restartLabel = 'Raising a new party…';
  else if (won) restartLabel = 'Descend anew';
  else restartLabel = 'Descend again';

  return (
    <div className="flex min-h-screen justify-center bg-[#1a1614] text-[#e8ddc8]">
      <div className="flex w-full max-w-md flex-col items-center gap-5 px-6 py-10 text-center">
        <p
          className={`font-mono text-xs uppercase tracking-[0.3em] ${accentText}`}
        >
          {won ? 'The campaign is won' : 'The run ends'}
        </p>

        {villainMark(color)}

        <div>
          <p className={`text-lg font-semibold ${accentText}`}>{boss}</p>
          <p className="font-mono text-[0.7rem] uppercase tracking-widest text-[#8a7d72]">
            {won ? 'lies defeated' : 'still waits below'}
          </p>
        </div>

        <p className="text-base italic leading-relaxed text-[#c9b896]">
          “{quote}”
        </p>

        <div className="grid w-full grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-[#2f2722] bg-[#1b1613] px-2 py-3"
            >
              <div className="text-lg font-semibold text-[#e8ddc8]">
                {stat.value}
              </div>
              <div className="font-mono text-[0.55rem] uppercase tracking-wider text-[#7a6f64]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {leaderboard && leaderboard.length > 0 && (
          <div className="w-full text-left">
            <Leaderboard
              entries={leaderboard}
              currentRun={currentRun ?? game.runNumber}
            />
          </div>
        )}

        <div className="mt-2 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onRestart}
            disabled={restarting}
            className="w-full rounded-lg bg-[#e8893f] px-5 py-3 font-semibold text-[#1a1614] transition hover:bg-[#f0a050] disabled:opacity-50"
          >
            {restartLabel}
          </button>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="font-mono text-xs tracking-wide text-[#8a7d72] transition hover:text-[#e8893f]"
            >
              ‹ Back to modes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
