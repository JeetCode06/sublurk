import { useEffect, useState } from 'react';
import type { ClassId } from '../../shared/game';
import { CLASS_INFO, classAffinitySummary } from '../../shared/classes';
import type { ClassNamesResponse, ErrorResponse } from '../../shared/api';
import {
  ABILITY_ORDER,
  ABILITY_SHORT,
  abilityMod,
  abilityModColor,
  signed,
} from '../lib';

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

export function CharacterSelect({
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
