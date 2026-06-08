// CausQ wordmark with the radiating teal "signal" dot. Matches the animated
// brand mark on causq.com so the logo reads as one live system across the
// marketing site and the portal. Safe to render from server or client.

export function Wordmark({
  variant = "white",
  className = "h-6 w-auto",
  dotSize = 7,
}: {
  /** which wordmark asset to show: "white" for dark surfaces, "ink" for light */
  variant?: "white" | "ink";
  /** sizing classes for the wordmark image (height controls scale) */
  className?: string;
  /** diameter of the trailing signal dot, in px */
  dotSize?: number;
}) {
  const src = variant === "ink" ? "/causq-ink.png" : "/causq-white.png";
  return (
    <span className="cq-lockup">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="CausQ" className={className} />
      <span
        className="cq-rad"
        aria-hidden="true"
        style={{ width: dotSize, height: dotSize }}
      />
    </span>
  );
}
