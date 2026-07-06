import { useState } from 'react';
import { INSTALL_URL } from '../../shared/api';
import type { ModRequestResponse, ErrorResponse } from '../../shared/api';
import { TorchlitScreen } from '../Embers';

type Result = { tone: 'ok' | 'warn' | 'err'; text: string };

export function InstallScreen({ onBack }: Readonly<{ onBack: () => void }>) {
  const [sub, setSub] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const sendRequest = async () => {
    const target = sub.trim();
    if (target.length === 0 || sending) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/request-mod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit: target }),
      });
      const data = (await res.json()) as ModRequestResponse | ErrorResponse;
      if (!('type' in data)) {
        setResult({ tone: 'err', text: data.message });
        return;
      }
      const name = data.subreddit ?? target;
      switch (data.status) {
        case 'sent':
          setResult({
            tone: 'ok',
            text: `Sent to r/${name}'s mods. If they add it, the dungeon comes to your community.`,
          });
          setSub('');
          break;
        case 'already_requested':
          setResult({
            tone: 'warn',
            text: `You've already asked r/${name}'s mods — no need to nudge twice.`,
          });
          break;
        case 'daily_limit':
          setResult({
            tone: 'warn',
            text: `That's today's limit of 3 requests. Try again tomorrow.`,
          });
          break;
        case 'invalid':
          setResult({
            tone: 'err',
            text: `That doesn't look like a real subreddit name.`,
          });
          break;
      }
    } catch {
      setResult({
        tone: 'err',
        text: 'Could not send the request. Try again.',
      });
    } finally {
      setSending(false);
    }
  };

  const toneClass =
    result?.tone === 'ok'
      ? 'text-teal-bright'
      : result?.tone === 'warn'
        ? 'text-ember'
        : 'text-[#f0594e]';

  return (
    <TorchlitScreen>
      <header className="text-center">
        <h1 className="font-display text-[28px] font-bold leading-tight text-ink">
          Play in your community
        </h1>
        <p className="mt-3 font-body text-[15px] italic leading-snug text-muted">
          The game reads your subreddit&apos;s own posts and builds a dungeon
          themed to your community. No two subs fall into the same place.
        </p>
      </header>

      {/* Moderator path */}
      <section className="mt-7 rounded-2xl border border-[#5a3a1e] bg-[#1d130b] p-4">
        <h2 className="font-display text-[18px] font-bold text-[#f6b063]">
          You moderate a sub
        </h2>
        <p className="mt-1.5 font-body text-[13.5px] leading-relaxed text-parchment">
          Add it to a community you moderate and it builds a brand-new dungeon
          from that sub&apos;s own posts.
        </p>
        <ol className="mt-3 flex flex-col gap-1.5 font-body text-[13px] leading-snug text-muted">
          <li>
            <span className="text-ember">1.</span> Open the app page on
            Reddit&apos;s Developer Platform.
          </li>
          <li>
            <span className="text-ember">2.</span> Click{' '}
            <span className="text-ink">+ Add to Community</span> and grant
            permissions.
          </li>
          <li>
            <span className="text-ember">3.</span> Pick a subreddit you fully
            moderate — done.
          </li>
        </ol>
        <a
          href={INSTALL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center rounded-lg bg-ember px-4 py-2.5 font-label text-[13px] font-semibold uppercase tracking-wide text-[#1a1006] transition hover:brightness-110"
        >
          Open the app page ↗
        </a>
        <p className="mt-2 text-center font-body text-[11px] text-faint">
          Installing is limited to subreddit moderators.
        </p>
      </section>

      {/* Non-moderator path */}
      <section className="mt-4 rounded-2xl border border-[#1d4a55] bg-[#07191e] p-4">
        <h2 className="font-display text-[18px] font-bold text-teal-bright">
          Not a mod? Ask them.
        </h2>
        <p className="mt-1.5 font-body text-[13.5px] leading-relaxed text-[#b6c9cc]">
          Nudge the mods of a community you love. We&apos;ll send them a
          one-time modmail with the install link, from you.
        </p>
        <div className="mt-3 flex gap-2">
          <div className="flex flex-1 items-center rounded-xl border border-[#1d4a55] bg-[#0a2128] px-3">
            <span className="font-label text-[13px] text-[#4f8f9c]">r/</span>
            <input
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void sendRequest();
              }}
              disabled={sending}
              placeholder="yoursubreddit"
              className="w-full flex-1 bg-transparent py-2.5 pl-1 font-body text-[14px] text-ink outline-none placeholder:italic placeholder:text-faint disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => void sendRequest()}
            disabled={sending || sub.trim().length === 0}
            className="shrink-0 rounded-xl bg-teal px-4 py-2.5 font-label text-[13px] font-semibold uppercase tracking-wide text-[#04181d] transition hover:brightness-110 disabled:opacity-40"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
        {result && (
          <p
            className={`mt-2.5 font-body text-[13px] leading-snug ${toneClass}`}
          >
            {result.text}
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 self-center font-label text-[11px] uppercase tracking-[0.2em] text-faint transition hover:text-ember"
      >
        ‹ Back to modes
      </button>
    </TorchlitScreen>
  );
}
