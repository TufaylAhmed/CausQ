import type { ReactNode } from "react";

// Presentational split-scene frame for auth pages (login, request access, invite,
// pending). Safe to render from client or server components.
export function AuthScene({
  kicker,
  title,
  children,
  foot,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="scene-ink hidden flex-col justify-between p-12 lg:flex">
        <a href="https://causq.com" className="relative z-10 flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/causq-white.png" alt="CausQ" className="h-8 w-auto" />
        </a>
        <div className="relative z-10">
          <p className="kicker" style={{ color: "var(--signal)" }}>
            Client portal
          </p>
          <h2 className="mt-5 max-w-md text-4xl font-semibold leading-[1.05] text-white">
            Secure access to your engagements, deliverables, and invoices.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
            AI-native, network-modern, quantum-secure. One integrated system,
            built to hand over.
          </p>
        </div>
        <p className="meta relative z-10" style={{ color: "rgba(255,255,255,0.4)" }}>
          Engineer-led &middot; vendor-agnostic &middot; global
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="reveal w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/causq-ink.png" alt="CausQ" className="mb-6 h-7 w-auto lg:hidden" />
          {kicker && <p className="kicker mb-3">{kicker}</p>}
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">{title}</h1>
          <div className="mt-7">{children}</div>
          {foot && <div className="mt-7 text-sm text-[var(--ink-mute)]">{foot}</div>}
        </div>
      </main>
    </div>
  );
}
