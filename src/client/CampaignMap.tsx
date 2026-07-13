import type { ReactNode } from 'react';
import type { MapNode, MapState } from '../shared/game';

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

// A folded-map glyph for the button that opens the campaign map.
export function MapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 4 3 6.2v13.8l6-2.2 6 2.2 6-2.2V3.8l-6 2.2-6-2.2Z" />
      <path d="M9 4v13.8M15 6.2V20" />
    </svg>
  );
}

// The full-screen overlay that presents the campaign map, shared by the board
// and the solo screen. Clicking the backdrop closes it.
export function MapModal({
  map,
  title,
  onClose,
}: Readonly<{ map: MapState; title: string; onClose: () => void }>) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0705]/90 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl border border-edge bg-[#100b08] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-label text-[11px] uppercase tracking-[0.2em] text-muted">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-label text-[11px] uppercase tracking-[0.2em] text-faint transition hover:text-ember"
          >
            Close
          </button>
        </div>
        <CampaignMap map={map} />
      </div>
    </div>
  );
}

// A small labelled button that opens the campaign map.
export function MapButton({
  onClick,
  children = 'Map',
}: Readonly<{ onClick: () => void; children?: ReactNode }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-[#5a3a1e] bg-[#1d130b] px-2.5 py-1 font-label text-[11px] uppercase tracking-[0.12em] text-ember-glow transition hover:brightness-110"
    >
      <MapIcon /> {children}
    </button>
  );
}
