"use client";

type PlayButtonProps = {
  visible: boolean;
  onClick: () => void;
};

// The glossy green "Play" CTA shown on every game's region-intro screen
// once its narration finishes — one shared visual identity across games,
// not a per-game reskin (same convention as GameTitleBanner). Distinct
// from the purple `continueButtonStyle` still used for the complete
// screen's "Finish" button, which this intentionally doesn't touch.
export function PlayButton({ visible, onClick }: PlayButtonProps) {
  return (
    <button
      type="button"
      className="tap-scale"
      onClick={onClick}
      disabled={!visible}
      style={{ ...buttonStyle, opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
    >
      <span aria-hidden style={sheenStyle} />
      <span style={labelStyle}>Play</span>
    </button>
  );
}

const buttonStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 40,
  left: 24,
  right: 24,
  minHeight: 58,
  border: "3px solid #2A4F12",
  borderRadius: 999,
  // A hard-ish two-tone split (light top half, distinctly darker bottom
  // half), not a smooth gradient — the "gumdrop candy button" look the
  // reference goes for, where the lighter/darker halves read as two
  // separate color blocks rather than one gradual fade.
  background: "linear-gradient(180deg, #C2F288 0%, #9BDE5C 47%, #5FAE33 53%, #4A9626 100%)",
  cursor: "pointer",
  boxShadow: "0 5px 0 #234010, 0 11px 18px rgba(0,0,0,0.45)",
  transition: "opacity 300ms ease",
  overflow: "hidden",
};

// A soft light-reflection band sitting within the lighter top half only —
// the key detail that reads as "glossy plastic/candy button" rather than
// a flat colored pill.
const sheenStyle: React.CSSProperties = {
  position: "absolute",
  top: 3,
  left: "7%",
  right: "7%",
  height: "30%",
  borderRadius: 999,
  background: "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0))",
};

const labelStyle: React.CSSProperties = {
  position: "relative",
  fontFamily: "var(--font-title), cursive",
  fontSize: 22,
  fontWeight: 800,
  color: "#fff",
  textShadow: "0 2px 0 #2E5E13, 0 3px 5px rgba(0,0,0,0.35)",
  letterSpacing: 0.3,
};
