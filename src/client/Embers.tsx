import type { ReactNode } from 'react';

// The torch-glow halo and two drifting embers shared by the firelit screens.
export function Embers() {
  return (
    <>
      <div
        className="ember-dot anim-flick"
        style={{
          top: '-60px',
          left: '50%',
          width: '420px',
          height: '360px',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(circle, rgba(232,137,63,.16), transparent 64%)',
          boxShadow: 'none',
          borderRadius: 0,
        }}
      />
      <div
        className="ember-dot"
        style={{
          left: '9%',
          bottom: '9%',
          width: '5px',
          height: '5px',
          animation: 'ember 6s ease-in infinite',
        }}
      />
      <div
        className="ember-dot"
        style={{
          right: '11%',
          bottom: '15%',
          width: '4px',
          height: '4px',
          background: '#f7c98a',
          animation: 'ember 7.5s ease-in 2s infinite',
        }}
      />
    </>
  );
}

// The firelit screen shell: torchlit background, embers, and a centered
// mobile-width column that rises in on mount.
export function TorchlitScreen({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="torchlit relative flex min-h-screen justify-center overflow-hidden">
      <Embers />
      <div className="anim-rise relative flex w-full max-w-[470px] flex-col px-5 py-11">
        {children}
      </div>
    </div>
  );
}
