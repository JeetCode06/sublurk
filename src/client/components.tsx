import { useEffect, useState } from 'react';
import type {
  Abilities,
  AbilityCheck,
  EntityKind,
  LeaderboardEntry,
  Party,
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

// The embers / inventory / conditions line shown under the health bar on both
// the community board and the solo screen.
export function PartyVitals({ party }: Readonly<{ party: Party }>) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 font-label text-[12px] text-muted">
      <span>◈ {party.embers} embers</span>
      {party.inventory.length > 0 && (
        <span>⚸ {party.inventory.join(', ')}</span>
      )}
      {party.conditions.length > 0 && (
        <span className="capitalize text-[#f0594e]">
          {party.conditions.join(', ')}
        </span>
      )}
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
  canResolve,
}: Readonly<{
  proposals: Proposal[];
  resolving: boolean;
  deadline: number;
  serverOffset: number | null;
  onResolveVotes: () => void;
  canResolve: boolean;
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

      {canResolve && (
        <button
          onClick={onResolveVotes}
          disabled={resolving || proposals.length === 0}
          className="self-start rounded-lg border border-[#5a3a1e] px-4 py-2 font-label text-[11px] font-semibold uppercase tracking-[0.16em] text-ember transition-colors hover:border-ember hover:bg-[#1d130b] disabled:opacity-40"
        >
          {resolving ? 'resolving…' : '⚄ Resolve top action now'}
        </button>
      )}
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

function ThreatPips({ threat }: Readonly<{ threat: number }>) {
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

function EntityCard({ entity }: Readonly<{ entity: SceneEntity }>) {
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
  // Under advantage or disadvantage two dice were thrown; show both so the
  // roll that was kept — and the one that wasn't — is visible.
  const dice =
    check.rolls.length > 1
      ? `rolled ${check.rolls.join(' & ')}, kept ${check.die}`
      : `rolled ${check.die}`;
  return (
    <p className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#2f2722] bg-[#140f0b] px-3 py-2 font-label text-[12px] text-muted">
      <span className="text-[13px] text-ember-glow">⚄</span>
      <span className="uppercase tracking-wide text-parchment">
        {ABILITY_SHORT[check.ability]} check{advantage}
      </span>
      <span className="text-faint">·</span>
      <span className="tabular-nums">
        {dice} {signed(check.modifier)} = {check.total} vs DC {check.difficulty}
      </span>
      <span className="text-faint">·</span>
      <span className={`font-semibold uppercase ${tone}`}>{check.outcome}</span>
    </p>
  );
}
