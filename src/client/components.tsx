import { useEffect, useState } from 'react';
import type {
  Abilities,
  AbilityCheck,
  EntityKind,
  LeaderboardEntry,
  MapNode,
  MapState,
  Proposal,
  SceneEntity,
} from '../shared/game';
import {
  ABILITY_ORDER,
  ABILITY_SHORT,
  abilityMod,
  advantageNote,
  outcomeTone,
  signed,
} from './lib';

export function HealthBar({
  hp,
  maxHp,
}: Readonly<{ hp: number; maxHp: number }>) {
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

export function RestartButton({
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

export function Countdown({
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

export function CandidateActions({
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

export function Leaderboard({
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

export function ThreatPips({ threat }: Readonly<{ threat: number }>) {
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

export function EntityCard({ entity }: Readonly<{ entity: SceneEntity }>) {
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

export function SceneEntities({
  entities,
}: Readonly<{ entities: SceneEntity[] }>) {
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

export function ThreatStrip({ threats }: Readonly<{ threats: string[] }>) {
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

export const MAP_W = 360;
export const MAP_TOP = 36;
export const MAP_STEP = 82;
export const MAP_LABEL_X = 116;
export const NODE_R = 18;
export const BOSS_R = 28;

export type NodeState = 'cleared' | 'current' | 'upcoming';

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

export function MapNodeMark({
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

export function MapBossMark({
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

export function CampaignMap({ map }: Readonly<{ map: MapState }>) {
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

export function StatBlock({ abilities }: Readonly<{ abilities: Abilities }>) {
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

export function LastCheck({ check }: Readonly<{ check: AbilityCheck }>) {
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
