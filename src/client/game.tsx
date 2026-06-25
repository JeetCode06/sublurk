import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  Abilities,
  AbilityCheck,
  AbilityId,
  ClassId,
  EntityKind,
  GameState,
  LeaderboardEntry,
  MapNode,
  MapState,
  Proposal,
  SceneEntity,
} from '../shared/game';
import { CLASS_INFO, classAffinitySummary } from '../shared/classes';
import type { ClassNamesResponse, ErrorResponse } from '../shared/api';
import { useGame, useSolo } from './hooks/useGame';

function HealthBar({ hp, maxHp }: Readonly<{ hp: number; maxHp: number }>) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const low = hp <= maxHp * 0.3;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/40">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            low ? 'bg-[#c0392b]' : 'bg-[#e8893f]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-sm tabular-nums text-[#d9c9a8]">
        {hp}/{maxHp}
      </span>
    </div>
  );
}

function RestartButton({
  resolving,
  onRestart,
}: Readonly<{
  resolving: boolean;
  onRestart: () => void;
}>) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex items-center gap-2 font-mono text-xs">
        <span className="text-[#8a7d72]">abandon run?</span>
        <button
          onClick={() => {
            onRestart();
            setConfirming(false);
          }}
          disabled={resolving}
          className="text-[#c0392b] hover:underline disabled:opacity-50"
        >
          yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[#8a7d72] hover:underline"
        >
          no
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="font-mono text-xs text-[#8a7d72] transition-colors hover:text-[#e8893f]"
    >
      ↻ new run
    </button>
  );
}

function Countdown({
  deadline,
  serverOffset,
}: Readonly<{
  deadline: number;
  serverOffset: number | null;
}>) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // No deadline yet, or no server-clock reading to correct for drift.
  if (deadline <= 0 || serverOffset === null) return null;

  const remainingMs = deadline - (now + serverOffset);
  if (remainingMs <= 0) {
    return (
      <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#e8893f]">
        resolving soon…
      </span>
    );
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return (
    <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#8a7d72]">
      resolves in {minutes}:{seconds}
    </span>
  );
}

function CandidateActions({
  proposals,
  resolving,
  deadline,
  serverOffset,
  onResolveVotes,
}: Readonly<{
  proposals: Proposal[];
  resolving: boolean;
  deadline: number;
  serverOffset: number | null;
  onResolveVotes: () => void;
}>) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
          Candidate actions
        </h2>
        <Countdown deadline={deadline} serverOffset={serverOffset} />
      </div>

      {proposals.length === 0 ? (
        <p className="rounded border border-dashed border-[#3a302b] px-4 py-6 text-center text-sm text-[#8a7d72]">
          No actions proposed yet. Reply to this post with what the party should
          do — it appears here for the hive to vote on.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {proposals.map((proposal, index) => {
            const leading = index === 0;
            return (
              <li
                key={proposal.id}
                className={`flex items-start gap-3 rounded border px-3 py-2.5 ${
                  leading
                    ? 'border-[#e8893f] bg-[#2a211b]'
                    : 'border-[#3a302b] bg-[#241d1a]'
                }`}
              >
                <span
                  className={`flex min-w-11 flex-col items-center font-mono leading-tight ${
                    leading ? 'text-[#f0a050]' : 'text-[#8a7d72]'
                  }`}
                >
                  <span className="text-sm tabular-nums">
                    ▲ {proposal.score}
                  </span>
                  {leading && (
                    <span className="text-[0.6rem] uppercase tracking-wide">
                      leading
                    </span>
                  )}
                </span>
                <span className="line-clamp-3 flex-1 text-sm leading-relaxed text-[#e8ddc8]">
                  {proposal.body}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={onResolveVotes}
        disabled={resolving || proposals.length === 0}
        className="self-start rounded border border-[#3a302b] px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#8a7d72] transition-colors hover:border-[#e8893f] hover:text-[#e8893f] disabled:opacity-40"
      >
        {resolving ? 'resolving…' : '🎲 resolve top-voted action'}
      </button>
    </section>
  );
}

function Leaderboard({
  entries,
  currentRun,
}: Readonly<{
  entries: LeaderboardEntry[];
  currentRun: number;
}>) {
  if (entries.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
        Deepest runs
      </h2>
      <ol className="flex flex-col gap-1">
        {entries.map((entry, index) => {
          const current = entry.runNumber === currentRun;
          return (
            <li
              key={entry.runNumber}
              className={`flex items-baseline justify-between gap-3 rounded px-3 py-1.5 font-mono text-sm ${
                current ? 'bg-[#2a211b] text-[#f0a050]' : 'text-[#a89880]'
              }`}
            >
              <span>
                {index + 1}. Run {entry.runNumber}
                {current && ' · this run'}
              </span>
              <span className="tabular-nums">depth {entry.depth}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const ENTITY_GLYPH: Record<EntityKind, { icon: string; tone: string }> = {
  foe: { icon: '☠', tone: 'text-[#d98a80]' },
  npc: { icon: '☻', tone: 'text-[#e8c070]' },
  object: { icon: '◇', tone: 'text-[#9fb0c0]' },
};

function ThreatPips({ threat }: Readonly<{ threat: number }>) {
  return (
    <span className="flex gap-0.5" title={`threat ${threat} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= threat ? 'text-[#c0392b]' : 'text-[#3a302b]'}
        >
          ●
        </span>
      ))}
    </span>
  );
}

function EntityCard({ entity }: Readonly<{ entity: SceneEntity }>) {
  const glyph = ENTITY_GLYPH[entity.kind];
  const showStats =
    entity.kind === 'foe' &&
    (entity.threat !== undefined || entity.hp !== undefined);
  return (
    <div className="flex flex-col gap-1.5 rounded border border-[#3a302b] bg-[#241d1a] px-3 py-2.5">
      <div className="flex items-baseline gap-2">
        <span className={`text-sm ${glyph.tone}`}>{glyph.icon}</span>
        <span className="flex-1 text-sm font-semibold text-[#e8ddc8]">
          {entity.name}
        </span>
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-[#5a4f47]">
          {entity.kind}
        </span>
      </div>
      {entity.blurb && (
        <p className="text-xs leading-relaxed text-[#8a7d72]">{entity.blurb}</p>
      )}
      {showStats && (
        <div className="flex items-center gap-3 font-mono text-[0.65rem] text-[#8a7d72]">
          {entity.threat !== undefined && <ThreatPips threat={entity.threat} />}
          {entity.hp !== undefined && (
            <span className="tabular-nums">{entity.hp} hp</span>
          )}
        </div>
      )}
    </div>
  );
}

function SceneEntities({ entities }: Readonly<{ entities: SceneEntity[] }>) {
  if (entities.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
        In the room
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entities.map((entity) => (
          <EntityCard key={`${entity.kind}-${entity.name}`} entity={entity} />
        ))}
      </div>
    </section>
  );
}

function ThreatStrip({ threats }: Readonly<{ threats: string[] }>) {
  if (threats.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-[#c0392b]">
        ⚠ dangers
      </span>
      {threats.map((threat) => (
        <span
          key={threat}
          className="rounded-full border border-[#5a2a25] bg-[#271a18] px-2.5 py-0.5 text-xs text-[#d98a80]"
        >
          {threat}
        </span>
      ))}
    </div>
  );
}

const MAP_W = 360;
const MAP_TOP = 36;
const MAP_STEP = 82;
const MAP_LABEL_X = 116;
const NODE_R = 18;
const BOSS_R = 28;

type NodeState = 'cleared' | 'current' | 'upcoming';

const NODE_PALETTE: Record<
  NodeState,
  { fill: string; ring: string; num: string; name: string; villain: string }
> = {
  current: {
    fill: '#2c221c',
    ring: '#e8893f',
    num: '#f0c050',
    name: '#f3cd7f',
    villain: '#cdbb9a',
  },
  cleared: {
    fill: '#241d1a',
    ring: '#4a3f38',
    num: '#8a7d72',
    name: '#8a7d72',
    villain: '#6f655b',
  },
  upcoming: {
    fill: '#1b1613',
    ring: '#352c26',
    num: '#5a4f46',
    name: '#675d54',
    villain: '#564c44',
  },
};

function nodeStateFor(
  index: number,
  currentIndex: number,
  cleared: boolean
): NodeState {
  if (index === currentIndex) return 'current';
  if (cleared) return 'cleared';
  return 'upcoming';
}

// A smooth winding path through the given points, used for the trail between
// map locations. Each segment eases vertically via control points at its midpoint.
function mapPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const mid = (a.y + b.y) / 2;
    d += ` C${a.x},${mid} ${b.x},${mid} ${b.x},${b.y}`;
  }
  return d;
}

function MapNodeMark({
  node,
  index,
  x,
  y,
  state,
}: Readonly<{
  node: MapNode;
  index: number;
  x: number;
  y: number;
  state: NodeState;
}>) {
  const current = state === 'current';
  const {
    fill,
    ring,
    num,
    name: nameFill,
    villain: villainFill,
  } = NODE_PALETTE[state];
  const nameY = node.villain ? y - 2 : y + 4;
  return (
    <>
      {current && (
        <>
          <circle cx={x} cy={y} r={NODE_R + 18} fill="#e8893f" opacity="0.06" />
          <circle cx={x} cy={y} r={NODE_R + 9} fill="#e8893f" opacity="0.11" />
          <polygon
            points={`${x},${y - NODE_R - 8} ${x + 5},${y - NODE_R - 3} ${x - 5},${y - NODE_R - 3}`}
            fill="#f0a050"
          />
        </>
      )}
      <circle
        cx={x}
        cy={y}
        r={NODE_R}
        fill={fill}
        stroke={ring}
        strokeWidth={current ? 2 : 1.5}
      />
      <circle
        cx={x}
        cy={y}
        r={NODE_R - 5}
        fill="none"
        stroke={ring}
        strokeWidth="0.6"
        opacity="0.5"
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize="12"
        fontWeight="600"
        fill={num}
      >
        {index + 1}
      </text>
      <text
        x={MAP_LABEL_X}
        y={nameY}
        fontFamily="sans-serif"
        fontSize="13"
        fontWeight="500"
        fill={nameFill}
      >
        {node.name}
      </text>
      {node.villain && (
        <text
          x={MAP_LABEL_X}
          y={y + 14}
          fontFamily="sans-serif"
          fontSize="11"
          fontStyle="italic"
          fill={villainFill}
        >
          {node.villain.name}
        </text>
      )}
    </>
  );
}

function MapBossMark({
  name,
  defeated,
  x,
  y,
}: Readonly<{
  name: string;
  defeated: boolean;
  x: number;
  y: number;
}>) {
  const crown = defeated ? '#6a5d52' : '#d07a64';
  const nameFill = defeated ? '#8a7d72' : '#ecc6ab';
  return (
    <>
      <polygon
        points={`${x - 22},${y + 34} ${x - 22},${y - 8} ${x - 12},${y + 4} ${x - 5},${y - 16} ${x},${y - 30} ${x + 5},${y - 16} ${x + 12},${y + 4} ${x + 22},${y - 8} ${x + 22},${y + 34}`}
        fill="#160f0d"
        stroke="#3a2622"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      {!defeated && (
        <>
          <circle cx={x} cy={y} r={BOSS_R + 18} fill="#c0392b" opacity="0.05" />
          <circle cx={x} cy={y} r={BOSS_R + 9} fill="#c0392b" opacity="0.09" />
        </>
      )}
      <circle
        cx={x}
        cy={y}
        r={BOSS_R}
        fill="#2a1714"
        stroke={defeated ? '#4a3f38' : '#c0392b'}
        strokeWidth="2"
      />
      <circle
        cx={x}
        cy={y}
        r={BOSS_R - 6}
        fill="none"
        stroke={defeated ? '#3a302b' : '#6a2018'}
        strokeWidth="0.6"
        opacity="0.6"
      />
      <path
        d={`M${x - 12},${y + 8} L${x - 12},${y - 4} L${x - 6},${y + 3} L${x},${y - 8} L${x + 6},${y + 3} L${x + 12},${y - 4} L${x + 12},${y + 8} Z`}
        fill="none"
        stroke={crown}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <text
        x={MAP_LABEL_X}
        y={y + 4}
        fontFamily="sans-serif"
        fontSize="13"
        fontWeight="500"
        fill={nameFill}
      >
        {name}
      </text>
    </>
  );
}

function CampaignMap({ map }: Readonly<{ map: MapState }>) {
  const nodes = map.nodes;
  const lastIndex = nodes.length - 1;
  const currentIndex = map.currentNodeIndex;
  const boss = map.finalBoss;
  const destination = nodes[lastIndex];
  const current = nodes[currentIndex];
  const clearedCount = nodes.filter((node) => node.cleared).length;

  const nodeX = (i: number) => 74 + (i % 2 === 0 ? -16 : 16);
  const nodeY = (i: number) => MAP_TOP + i * MAP_STEP;
  const bossX = 74;
  const bossY = MAP_TOP + nodes.length * MAP_STEP;
  const height = bossY + 70;

  const points = [
    ...nodes.map((_, i) => ({ x: nodeX(i), y: nodeY(i) })),
    { x: bossX, y: bossY },
  ];
  const traveled = mapPath(points.slice(0, currentIndex + 1));
  const ahead = mapPath(points.slice(currentIndex));

  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[#5a4f47]">
          Objective
        </p>
        {boss.defeated ? (
          <p className="text-sm text-[#a89880]">
            Campaign complete — {boss.name} has fallen.
          </p>
        ) : (
          <p className="text-sm leading-snug text-[#e8ddc8]">
            Descend to{' '}
            <span className="text-[#c9b896]">
              {destination?.name ?? 'the final chamber'}
            </span>
            {' · defeat '}
            <span className="text-[#c0705a]">{boss.name}</span>
          </p>
        )}
      </div>

      <div className="mx-auto w-full max-w-sm">
        <svg
          viewBox={`0 0 ${MAP_W} ${height}`}
          className="w-full"
          role="img"
          aria-label="Campaign map"
        >
          <defs>
            <linearGradient id="mapStone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#211a16" />
              <stop offset="1" stopColor="#140f0d" />
            </linearGradient>
            <radialGradient id="mapVignette" cx="0.5" cy="0.4" r="0.7">
              <stop offset="0.5" stopColor="#000000" stopOpacity="0" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
            </radialGradient>
            <pattern
              id="mapMasonry"
              width="40"
              height="56"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0,0 H40 M0,28 H40 M0,56 H40"
                stroke="#332b25"
                strokeWidth="0.6"
                opacity="0.5"
              />
              <path
                d="M0,0 V28 M20,28 V56"
                stroke="#332b25"
                strokeWidth="0.6"
                opacity="0.5"
              />
            </pattern>
            <clipPath id="mapClip">
              <rect x="1" y="1" width={MAP_W - 2} height={height - 2} rx="13" />
            </clipPath>
          </defs>

          <rect
            x="1"
            y="1"
            width={MAP_W - 2}
            height={height - 2}
            rx="13"
            fill="url(#mapStone)"
          />
          <rect
            x="1"
            y="1"
            width={MAP_W - 2}
            height={height - 2}
            fill="url(#mapMasonry)"
            clipPath="url(#mapClip)"
          />
          <rect
            x="1"
            y="1"
            width={MAP_W - 2}
            height={height - 2}
            fill="url(#mapVignette)"
            clipPath="url(#mapClip)"
          />
          <rect
            x="0.75"
            y="0.75"
            width={MAP_W - 1.5}
            height={height - 1.5}
            rx="13.5"
            fill="none"
            stroke="#3a302b"
            strokeWidth="1"
          />

          <path
            d={mapPath(points)}
            fill="none"
            stroke="#100c0a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {ahead && (
            <path
              d={ahead}
              fill="none"
              stroke="#352c26"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="2 7"
            />
          )}
          {traveled && (
            <path
              d={traveled}
              fill="none"
              stroke="#e8893f"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {nodes.map((node, i) => (
            <MapNodeMark
              key={node.id}
              node={node}
              index={i}
              x={nodeX(i)}
              y={nodeY(i)}
              state={nodeStateFor(i, currentIndex, node.cleared)}
            />
          ))}

          <MapBossMark
            name={boss.name}
            defeated={boss.defeated}
            x={bossX}
            y={bossY}
          />
        </svg>
      </div>

      {!boss.defeated && (
        <p className="text-center font-mono text-[0.65rem] text-[#8a7d72]">
          At {current?.name ?? 'the start'} · {clearedCount}/{nodes.length}{' '}
          cleared
        </p>
      )}
    </section>
  );
}

const ABILITY_ORDER: AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const ABILITY_SHORT: Record<AbilityId, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function abilityModColor(mod: number): string {
  if (mod > 0) return 'text-[#e8893f]';
  if (mod < 0) return 'text-[#c0705a]';
  return 'text-[#6a5d52]';
}

function advantageNote(advantage: AbilityCheck['advantage']): string {
  if (advantage === 'advantage') return ' · advantage';
  if (advantage === 'disadvantage') return ' · disadvantage';
  return '';
}

function outcomeTone(outcome: AbilityCheck['outcome']): string {
  if (outcome === 'success') return 'text-[#7fb069]';
  if (outcome === 'partial') return 'text-[#e8c050]';
  return 'text-[#c0705a]';
}

function StatBlock({ abilities }: Readonly<{ abilities: Abilities }>) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
      {ABILITY_ORDER.map((id) => (
        <span key={id}>
          <span className="text-[#8a7d72]">{ABILITY_SHORT[id]}</span>{' '}
          <span className="text-[#e8ddc8]">{abilities[id]}</span>{' '}
          <span className="text-[#6f6359]">
            {signed(abilityMod(abilities[id]))}
          </span>
        </span>
      ))}
    </div>
  );
}

function LastCheck({ check }: Readonly<{ check: AbilityCheck }>) {
  const advantage = advantageNote(check.advantage);
  const tone = outcomeTone(check.outcome);
  return (
    <p className="font-mono text-xs text-[#6f6359]">
      {ABILITY_SHORT[check.ability]} check{advantage} · rolled {check.die},
      total {check.total} vs {check.difficulty} ·{' '}
      <span className={tone}>{check.outcome}</span>
    </p>
  );
}

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

function RunSummary({
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

function Board({
  game,
  resolving,
  error,
  note,
  proposals,
  serverOffset,
  leaderboard,
  onAct,
  onResolveVotes,
  onRestart,
}: Readonly<{
  game: GameState;
  resolving: boolean;
  error: string | null;
  note: string | null;
  proposals: Proposal[];
  serverOffset: number | null;
  leaderboard: LeaderboardEntry[];
  onAct: (action: string) => void;
  onResolveVotes: () => void;
  onRestart: () => void;
}>) {
  const [draft, setDraft] = useState('');

  if (game.phase === 'dead' || game.phase === 'won') {
    return (
      <RunSummary
        game={game}
        restarting={resolving}
        onRestart={onRestart}
        leaderboard={leaderboard}
        currentRun={game.runNumber}
      />
    );
  }

  const log = game.recentEvents.slice().reverse();
  const record = leaderboard[0]?.depth ?? null;
  const scene =
    game.room.description ||
    'The party presses into the dark. The dungeon master is setting the scene…';

  const submit = () => {
    const action = draft.trim();
    if (action.length === 0 || resolving) return;
    onAct(action);
    setDraft('');
  };

  return (
    <div className="flex min-h-screen justify-center bg-[#1a1614] text-[#e8ddc8]">
      <div className="flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
        <header className="flex flex-col gap-3 border-b border-[#3a302b] pb-4">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-wide text-[#f0a050]">
              {game.party.name}
            </h1>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-[#8a7d72]">
                Run {game.runNumber} · Depth {game.party.depth}
              </span>
              <RestartButton resolving={resolving} onRestart={onRestart} />
            </div>
          </div>
          <HealthBar hp={game.party.hp} maxHp={game.party.maxHp} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[#8a7d72]">
            <span>◈ {game.party.gold} gold</span>
            {game.party.inventory.length > 0 && (
              <span>⚸ {game.party.inventory.join(', ')}</span>
            )}
            {game.party.conditions.length > 0 && (
              <span className="text-[#c0392b] capitalize">
                {game.party.conditions.join(', ')}
              </span>
            )}
            {record !== null && <span>🏆 record depth {record}</span>}
          </div>
          <StatBlock abilities={game.party.abilities} />
        </header>

        <main className="flex flex-1 flex-col gap-5">
          {game.intro.length > 0 && (
            <section className="rounded border border-[#3a302b] bg-[#211b17] px-4 py-3">
              <p className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#8a7d72]">
                Prologue
              </p>
              <p className="text-sm italic leading-relaxed text-[#c9b896]">
                {game.intro}
              </p>
            </section>
          )}
          <CampaignMap map={game.map} />
          <section className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
              {game.room.type} · depth {game.party.depth}
            </p>
            <p className="text-lg leading-relaxed text-[#e8ddc8]">{scene}</p>
            {game.lastCheck && <LastCheck check={game.lastCheck} />}
            <SceneEntities entities={game.room.entities} />
            <ThreatStrip threats={game.room.threats} />
            {log.length > 0 && (
              <div className="flex flex-col gap-2 border-l-2 border-[#3a302b] pl-4">
                {log.map((event) => (
                  <p
                    key={event}
                    className="text-sm leading-relaxed text-[#8a7d72]"
                  >
                    {event}
                  </p>
                ))}
              </div>
            )}
          </section>

          <p className="text-sm leading-relaxed text-[#a89880]">
            Reply to this post with what the party should do, or upvote an
            action below. When the turn resolves, the top-voted action is the
            one the party takes.
          </p>
          <CandidateActions
            proposals={proposals}
            resolving={resolving}
            deadline={game.nextResolveAt}
            serverOffset={serverOffset}
            onResolveVotes={onResolveVotes}
          />
        </main>

        <footer className="flex flex-col gap-3 border-t border-[#3a302b] pt-4">
          {error && <p className="text-sm text-[#c0392b]">{error}</p>}
          {note && <p className="text-sm text-[#e8893f]">{note}</p>}
          <div className="flex flex-col gap-2 rounded border border-[#3a302b] bg-[#1f1916] px-3 py-3">
            <p className="font-mono text-[0.65rem] uppercase tracking-widest text-[#5a4f47]">
              Playing solo? Take a single action directly
            </p>
            {game.room.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {game.room.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setDraft(suggestion)}
                    disabled={resolving}
                    className="rounded-full border border-[#3a302b] bg-[#241d1a] px-2.5 py-1 text-xs text-[#c9b896] transition-colors hover:border-[#e8893f] hover:text-[#e8ddc8] disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
                disabled={resolving}
                placeholder="Search the altar, draw a blade, light a torch…"
                className="flex-1 rounded border border-[#3a302b] bg-[#241d1a] px-3 py-2.5 text-[#e8ddc8] outline-none placeholder:text-[#5a4f47] focus:border-[#e8893f] disabled:opacity-50"
              />
              <button
                onClick={submit}
                disabled={resolving || draft.trim().length === 0}
                className="rounded bg-[#e8893f] px-5 py-2.5 font-semibold text-[#1a1614] transition-colors hover:bg-[#f0a050] disabled:opacity-40"
              >
                {resolving ? '…' : 'Act'}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ModeSelect({
  onSolo,
  onCommunity,
}: Readonly<{
  onSolo: () => void;
  onCommunity: () => void;
}>) {
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

        <button
          type="button"
          className="mx-auto mt-7 block font-mono text-[11px] tracking-wide text-[#6a5d52] transition hover:text-[#8a7d72]"
        >
          Get Hivemind Crawl on your subreddit →
        </button>
      </div>
    </div>
  );
}

const CLASS_ORDER: ClassId[] = [
  'warrior',
  'witch',
  'healer',
  'trickster',
  'adventurer',
];

const CLASS_ROLE: Record<ClassId, string> = {
  warrior: 'Frontline',
  witch: 'Arcane',
  healer: 'Support',
  trickster: 'Cunning',
  adventurer: 'Balanced',
};

function classSigil(id: ClassId) {
  switch (id) {
    case 'warrior':
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path
            d="M9 9 L23 23 M23 9 L9 23"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'witch':
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <circle
            cx="16"
            cy="16"
            r="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="16" cy="16" r="2.2" fill="currentColor" />
        </svg>
      );
    case 'healer':
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path
            d="M16 7 V25 M7 16 H25"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'trickster':
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <circle
            cx="16"
            cy="11"
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16 15 V25 M16 21 H21 M16 24 H20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'adventurer':
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path
            d="M16 5 L19 13 L27 16 L19 19 L16 27 L13 19 L5 16 L13 13 Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

function CharacterSelect({
  onBack,
  onBegin,
}: Readonly<{
  onBack: () => void;
  onBegin: (classId: string) => void;
}>) {
  const [selected, setSelected] = useState<ClassId>('warrior');
  const [themed, setThemed] = useState<Record<ClassId, string> | null>(null);
  const klass = CLASS_INFO[selected];
  const { strong, weak } = classAffinitySummary(selected);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch('/api/classes');
        const data = (await res.json()) as ClassNamesResponse | ErrorResponse;
        if (active && 'type' in data) setThemed(data.names);
      } catch {
        // Keep the base archetype names if themed names can't be loaded.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedName = themed?.[selected] ?? klass.name;
  const selectedTag =
    selectedName === klass.name
      ? CLASS_ROLE[selected]
      : `${klass.name} · ${CLASS_ROLE[selected]}`;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1a1614] px-5 py-10 text-[#e8ddc8]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55))]" />
      <div className="relative w-full max-w-md">
        <div className="text-center font-mono text-sm tracking-[0.35em] text-[#b6a08a]">
          HIVEMIND CRAWL
        </div>
        <h1 className="mt-3 text-center text-xl font-medium text-[#ecd9bb]">
          Choose your character
        </h1>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          {CLASS_ORDER.map((id) => {
            const info = CLASS_INFO[id];
            const display = themed?.[id] ?? info.name;
            const tag = display === info.name ? CLASS_ROLE[id] : info.name;
            const isSelected = id === selected;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  id === 'adventurer' ? 'col-span-2' : ''
                } ${
                  isSelected
                    ? 'border-[#e8893f] bg-[#2a211c]'
                    : 'border-[#3a302b] bg-[#201a16] hover:border-[#5a4f47]'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                    isSelected
                      ? 'border-[#e8893f] bg-[#3a2c20] text-[#f0c050]'
                      : 'border-[#4a3f38] bg-[#241d18] text-[#897c71]'
                  }`}
                >
                  {classSigil(id)}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-medium ${
                      isSelected ? 'text-[#f3cd7f]' : 'text-[#a89a8c]'
                    }`}
                  >
                    {display}
                  </span>
                  <span className="block font-mono text-[0.65rem] uppercase tracking-wider text-[#7a6f64]">
                    {tag}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-[#2f2722] bg-[#1b1613] p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-medium text-[#f3cd7f]">
              {selectedName}
            </span>
            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-[#7a6f64]">
              {selectedTag}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-1 text-center">
            {ABILITY_ORDER.map((ability) => {
              const score = klass.abilities[ability];
              const mod = abilityMod(score);
              return (
                <div key={ability}>
                  <div className="font-mono text-[0.6rem] tracking-wider text-[#8a7d72]">
                    {ABILITY_SHORT[ability]}
                  </div>
                  <div className="text-sm font-medium text-[#e8ddc8]">
                    {score}
                  </div>
                  <div
                    className={`font-mono text-[0.65rem] ${abilityModColor(mod)}`}
                  >
                    {signed(mod)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {strong.length > 0 && (
              <span className="rounded-full border border-[#8a6a2e] bg-[#2a2114] px-2.5 py-1 text-[0.7rem] text-[#d8b06a]">
                Strong vs {strong.join(', ')}
              </span>
            )}
            {weak.length > 0 && (
              <span className="rounded-full border border-[#6a3a30] bg-[#2a1714] px-2.5 py-1 text-[0.7rem] text-[#c0705a]">
                Weak at {weak.join(', ')}
              </span>
            )}
            {strong.length === 0 && weak.length === 0 && (
              <span className="rounded-full border border-[#3a302b] bg-[#201a16] px-2.5 py-1 text-[0.7rem] text-[#8a7d72]">
                No strengths or weaknesses
              </span>
            )}
          </div>
          <p className="mt-3 text-xs italic leading-snug text-[#c9b896]">
            ✦ {klass.signature}
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => onBegin(selected)}
            className="w-full rounded-lg bg-[#e8893f] px-5 py-3 font-medium text-[#1a1614] transition hover:bg-[#f0a050]"
          >
            Begin the descent
          </button>
          <button
            type="button"
            onClick={onBack}
            className="font-mono text-xs tracking-wide text-[#8a7d72] transition hover:text-[#e8893f]"
          >
            ‹ Back to modes
          </button>
        </div>
      </div>
    </div>
  );
}

const SOLO_DEFAULT_CLASS = 'adventurer';

function SoloPlay({
  solo,
  classId,
  onExit,
}: Readonly<{
  solo: ReturnType<typeof useSolo>;
  classId: string;
  onExit: () => void;
}>) {
  const [draft, setDraft] = useState('');
  const { game, loading, resolving, error } = solo;

  if (loading || !game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1614] px-6 text-center font-mono text-sm text-[#8a7d72]">
        {loading ? 'Descending into the dark…' : (error ?? 'No solo run yet.')}
      </div>
    );
  }

  if (game.phase === 'dead' || game.phase === 'won') {
    return (
      <RunSummary
        game={game}
        restarting={resolving}
        onRestart={() => void solo.start(classId)}
        onExit={onExit}
      />
    );
  }

  const log = game.recentEvents.slice().reverse();
  const scene =
    game.room.description ||
    'You press into the dark. The dungeon master is setting the scene…';

  const submit = () => {
    const action = draft.trim();
    if (action.length === 0 || resolving) return;
    void solo.act(action);
    setDraft('');
  };

  return (
    <div className="flex min-h-screen justify-center bg-[#1a1614] text-[#e8ddc8]">
      <div className="flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
        <header className="flex flex-col gap-3 border-b border-[#3a302b] pb-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExit}
              className="font-mono text-[0.65rem] uppercase tracking-widest text-[#6a5d52] transition hover:text-[#e8893f]"
            >
              ‹ Modes
            </button>
            <span className="font-mono text-xs uppercase tracking-widest text-[#8a7d72]">
              Solo · Run {game.runNumber} · Depth {game.party.depth}
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-wide text-[#f0a050]">
            {game.party.name}
          </h1>
          <HealthBar hp={game.party.hp} maxHp={game.party.maxHp} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[#8a7d72]">
            <span>◈ {game.party.gold} gold</span>
            {game.party.inventory.length > 0 && (
              <span>⚸ {game.party.inventory.join(', ')}</span>
            )}
            {game.party.conditions.length > 0 && (
              <span className="text-[#c0392b] capitalize">
                {game.party.conditions.join(', ')}
              </span>
            )}
          </div>
          <StatBlock abilities={game.party.abilities} />
        </header>

        <main className="flex flex-1 flex-col gap-5">
          {game.intro.length > 0 && (
            <section className="rounded border border-[#3a302b] bg-[#211b17] px-4 py-3">
              <p className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#8a7d72]">
                Prologue
              </p>
              <p className="text-sm italic leading-relaxed text-[#c9b896]">
                {game.intro}
              </p>
            </section>
          )}
          <CampaignMap map={game.map} />
          <section className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8a7d72]">
              {game.room.type} · depth {game.party.depth}
            </p>
            <p className="text-lg leading-relaxed text-[#e8ddc8]">{scene}</p>
            {game.lastCheck && <LastCheck check={game.lastCheck} />}
            <SceneEntities entities={game.room.entities} />
            <ThreatStrip threats={game.room.threats} />
            {log.length > 0 && (
              <div className="flex flex-col gap-2 border-l-2 border-[#3a302b] pl-4">
                {log.map((event) => (
                  <p
                    key={event}
                    className="text-sm leading-relaxed text-[#8a7d72]"
                  >
                    {event}
                  </p>
                ))}
              </div>
            )}
          </section>
        </main>

        <footer className="flex flex-col gap-3 border-t border-[#3a302b] pt-4">
          {error && <p className="text-sm text-[#c0392b]">{error}</p>}
          <div className="flex flex-col gap-2 rounded border border-[#3a302b] bg-[#1f1916] px-3 py-3">
            {game.room.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {game.room.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setDraft(suggestion)}
                    disabled={resolving}
                    className="rounded-full border border-[#3a302b] bg-[#241d1a] px-2.5 py-1 text-xs text-[#c9b896] transition-colors hover:border-[#e8893f] hover:text-[#e8ddc8] disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
                disabled={resolving}
                placeholder="Search the altar, draw a blade, light a torch…"
                className="flex-1 rounded border border-[#3a302b] bg-[#241d1a] px-3 py-2.5 text-[#e8ddc8] outline-none placeholder:text-[#5a4f47] focus:border-[#e8893f] disabled:opacity-50"
              />
              <button
                onClick={submit}
                disabled={resolving || draft.trim().length === 0}
                className="rounded bg-[#e8893f] px-5 py-2.5 font-semibold text-[#1a1614] transition-colors hover:bg-[#f0a050] disabled:opacity-40"
              >
                {resolving ? '…' : 'Act'}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

type View = 'mode_select' | 'character_select' | 'play';
type Mode = 'solo' | 'community';

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
      />
    );
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
