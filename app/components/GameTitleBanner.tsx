"use client";

type GameTitleBannerProps = {
  title: string;
};

// The real painted wood-sign banner (public/ui/title-banner.png) — shown
// on every game's region-intro screen, one shared visual identity across
// games, not a per-game reskin (same convention as FumiPortrait). Source
// art had its checkerboard "transparent" placeholder baked in as literal
// pixels rather than a real alpha channel; it was re-keyed out (by hue/
// brightness, not a hand-drawn mask) before being added here.
export function GameTitleBanner({ title }: GameTitleBannerProps) {
  return (
    <div style={wrapStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ui/title-banner.png" alt="" style={imgStyle} draggable={false} />
      <div style={titleTextStyle}>{title}</div>
    </div>
  );
}

// Source asset is 1100x343 (already trimmed to its own visible bounds).
const BANNER_ASPECT_RATIO = "1100 / 343";

const wrapStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  // Shrink-wraps to the title text's own width (+ its padding below)
  // rather than a fixed size, so a short title like "Gatekeeper" doesn't
  // leave a wide stretch of empty plank on either side the way a
  // fixed-width banner would — the whole banner (art included) just
  // renders a bit smaller for short titles, proportionally.
  width: "fit-content",
  minWidth: 230,
  maxWidth: "92vw",
  aspectRatio: BANNER_ASPECT_RATIO,
};

const imgStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "fill",
  filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.5))",
  userSelect: "none",
};

const titleTextStyle: React.CSSProperties = {
  position: "relative",
  fontFamily: "var(--font-title), cursive",
  fontSize: 26,
  fontWeight: 800,
  color: "#FFF6E0",
  textShadow: "0 2px 0 #4A2A12, 0 4px 8px rgba(0,0,0,0.5)",
  letterSpacing: 0.3,
  textAlign: "center",
  whiteSpace: "nowrap",
  // Wide enough that even the longest title (e.g. "Switch Yard Rescue")
  // stays within the plank's flat, uncurved middle ~73% — the curved
  // ends and end-caps start past that.
  padding: "0 50px",
  transform: "translateY(-6%)",
};
