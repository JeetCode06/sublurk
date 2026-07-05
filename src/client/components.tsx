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
    <div className="flex items-center gap-2.5">
      <span className="text-[15px] text-blood">♥</span>
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#2a1512]"
        style={
          low ? { animation: 'hppulse 1.4s ease-in-out infinite' } : undefined
        }
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #b3302b, #f0594e)',
          }}
        />
      </div>
      <span className="font-label text-[13px] tabular-nums text-parchment">
        {hp}
        <span className="text-faint">/{maxHp}</span>
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
      <span className="flex items-center gap-2 font-label text-[11px] uppercase tracking-wide">
        <span className="text-muted">abandon run?</span>
        <button
          onClick={() => {
            onRestart();
            setConfirming(false);
          }}
          disabled={resolving}
          className="text-blood hover:underline disabled:opacity-50"
        >
          yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-muted hover:underline"
        >
          no
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="font-label text-[11px] uppercase tracking-wide text-faint transition-colors hover:text-ember"
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
      <span className="font-label text-[10px] uppercase tracking-[0.18em] text-ember">
        resolving soon…
      </span>
    );
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return (
    <span className="font-label text-[10px] uppercase tracking-[0.18em] text-muted">
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
        <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.24em] text-parchment">
          Vote the next move
        </h2>
        <Countdown deadline={deadline} serverOffset={serverOffset} />
      </div>

      {proposals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-edge px-4 py-6 text-center font-body text-[13.5px] italic leading-snug text-muted">
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
                className="flex items-start gap-3 rounded-xl border px-3 py-2.5"
                style={{
                  borderColor: leading ? '#e8893f' : '#2f2722',
                  background: leading
                    ? 'linear-gradient(180deg, #291d12, #1d140d)'
                    : '#161009',
                }}
              >
                <span
                  className={`flex min-w-11 flex-col items-center font-label leading-tight ${
                    leading ? 'text-ember-bright' : 'text-muted'
                  }`}
                >
                  <span className="text-[15px] tabular-nums">
                    ▲ {proposal.score}
                  </span>
                  {leading && (
                    <span className="text-[9px] uppercase tracking-[0.14em]">
                      leading
                    </span>
                  )}
                </span>
                <span className="line-clamp-3 flex-1 font-body text-[14px] leading-snug text-ink">
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
        className="self-start rounded-lg border border-[#5a3a1e] px-4 py-2 font-label text-[11px] font-semibold uppercase tracking-[0.16em] text-ember transition-colors hover:border-ember hover:bg-[#1d130b] disabled:opacity-40"
      >
        {resolving ? 'resolving…' : '⚄ Resolve top action now'}
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
      <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
        Deepest runs
      </h2>
      <ol className="flex flex-col gap-1">
        {entries.map((entry, index) => {
          const current = entry.runNumber === currentRun;
          return (
            <li
              key={entry.runNumber}
              className="flex items-baseline justify-between gap-3 rounded-lg px-3 py-1.5 font-label text-[13px]"
              style={{
                background: current ? 'rgba(232,137,63,0.1)' : 'transparent',
                color: current ? '#f6b063' : '#a89880',
              }}
            >
              <span>
                <span className="tabular-nums">{index + 1}.</span> Run{' '}
                {entry.runNumber}
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

const ENTITY_GLYPH: Record<
  EntityKind,
  { icon: string; tone: string; border: string; bg: string }
> = {
  foe: {
    icon: '☠',
    tone: 'text-[#f0594e]',
    border: '#5a2420',
    bg: 'linear-gradient(180deg, #241310, #180c0a)',
  },
  npc: {
    icon: '☻',
    tone: 'text-[#e8c15a]',
    border: '#5a4a1e',
    bg: 'linear-gradient(180deg, #221a0e, #171009)',
  },
  object: {
    icon: '◇',
    tone: 'text-[#7fd6e4]',
    border: '#1d4a55',
    bg: 'linear-gradient(180deg, #0e1a1d, #0a1113)',
  },
};

export function ThreatPips({ threat }: Readonly<{ threat: number }>) {
  return (
    <span className="flex gap-0.5" title={`threat ${threat} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= threat ? 'text-[#f0594e]' : 'text-[#3a2c20]'}
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
    <div
      className="flex flex-col gap-1.5 rounded-xl border px-3 py-2.5"
      style={{
        borderColor: glyph.border,
        background: glyph.bg,
        opacity: entity.kind === 'foe' && entity.hp === 0 ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-2">
        <span className={`text-[15px] ${glyph.tone}`}>{glyph.icon}</span>
        <span className="flex-1 font-display text-[14px] font-semibold leading-tight text-ink">
          {entity.name}
        </span>
        <span className="font-label text-[9px] uppercase tracking-[0.14em] text-faint">
          {entity.kind}
        </span>
      </div>
      {entity.blurb && (
        <p className="font-body text-[12.5px] italic leading-snug text-muted">
          {entity.blurb}
        </p>
      )}
      {showStats && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 font-label text-[11px] text-muted">
            {entity.threat !== undefined && (
              <ThreatPips threat={entity.threat} />
            )}
            {entity.hp !== undefined && entity.maxHp !== undefined && (
              <span className="tabular-nums text-[#d08a78]">
                {entity.hp}/{entity.maxHp} HP
              </span>
            )}
          </div>
          {entity.hp !== undefined &&
            entity.maxHp !== undefined &&
            entity.maxHp > 0 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-[#2a1512]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#b3302b] to-[#f0594e] transition-[width] duration-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100))}%`,
                  }}
                />
              </div>
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
    <section className="flex flex-col gap-2.5">
      <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
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
      <span className="font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0594e]">
        ⚠ dangers
      </span>
      {threats.map((threat) => (
        <span
          key={threat}
          className="rounded-full border border-[#5a2a25] bg-[#241312] px-2.5 py-0.5 font-body text-[12px] text-[#d98a80]"
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
        fontFamily="Oswald, sans-serif"
        fontSize="12"
        fontWeight="600"
        fill={num}
      >
        {index + 1}
      </text>
      <text
        x={MAP_LABEL_X}
        y={nameY}
        fontFamily="Oswald, sans-serif"
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
          fontFamily="Oswald, sans-serif"
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
        fontFamily="Oswald, sans-serif"
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
        <p className="font-label text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
          Winning
        </p>
        {boss.defeated ? (
          <p className="mt-0.5 font-body text-[14px] text-parchment">
            Campaign complete — {boss.name} has fallen.
          </p>
        ) : (
          <p className="mt-0.5 font-body text-[14px] leading-snug text-ink">
            Descend to{' '}
            <span className="text-parchment">
              {destination?.name ?? 'the final chamber'}
            </span>
            {' · defeat '}
            <span className="text-[#d08a78]">{boss.name}</span>
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
        <p className="text-center font-label text-[11px] uppercase tracking-[0.12em] text-muted">
          At {current?.name ?? 'the start'} · {clearedCount}/{nodes.length}{' '}
          cleared
        </p>
      )}
    </section>
  );
}

export function StatBlock({ abilities }: Readonly<{ abilities: Abilities }>) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 font-label text-[12px]">
      {ABILITY_ORDER.map((id) => (
        <span key={id} className="tabular-nums">
          <span className="uppercase tracking-wide text-muted">
            {ABILITY_SHORT[id]}
          </span>{' '}
          <span className="text-ink">{abilities[id]}</span>{' '}
          <span className="text-faint">
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
    <p className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#2f2722] bg-[#140f0b] px-3 py-2 font-label text-[12px] text-muted">
      <span className="text-[13px] text-ember-glow">⚄</span>
      <span className="uppercase tracking-wide text-parchment">
        {ABILITY_SHORT[check.ability]} check{advantage}
      </span>
      <span className="text-faint">·</span>
      <span className="tabular-nums">
        rolled {check.die}, total {check.total} vs {check.difficulty}
      </span>
      <span className="text-faint">·</span>
      <span className={`font-semibold uppercase ${tone}`}>{check.outcome}</span>
    </p>
  );
}
