// Presentational wrapper only. Auth gating is handled by middleware
// (src/middleware.ts) and per-page status checks; keeping this layout free of
// redirects avoids looping on the public /portal/login and /portal/request-access pages.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
