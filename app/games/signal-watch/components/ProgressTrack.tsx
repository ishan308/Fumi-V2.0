"use client";

type ProgressTrackProps = {
  total: number;
  currentIndex: number; // 0-based
};

// The chain-of-nodes mission tracker from the reference art — a glowing
// spark for the round in progress, solid gold for ones already restored,
// plain stone for what's still ahead, strung along one connecting line.
export function ProgressTrack({ total, currentIndex }: ProgressTrackProps) {
  return (
    <div style={trackStyle} role="img" aria-label={`Round ${currentIndex + 1} of ${total}`}>
      <div style={lineStyle} aria-hidden />
      {Array.from({ length: total }, (_, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        return (
          <div
            key={i}
            aria-hidden
            style={{
              ...nodeStyle,
              background: state === "upcoming" ? "#5B6472" : state === "done" ? "#F0C572" : "radial-gradient(circle, #9FE0FF, #3DA5E8)",
              boxShadow: state === "current" ? "0 0 10px rgba(79,168,232,0.9)" : "none",
              animation: state === "current" ? "glow-pulse 1.6s ease-in-out infinite" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

const trackStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "0 4px",
};

const lineStyle: React.CSSProperties = {
  position: "absolute",
  left: 4,
  right: 4,
  top: "50%",
  height: 2,
  background: "rgba(255,255,255,0.25)",
  transform: "translateY(-50%)",
};

const nodeStyle: React.CSSProperties = {
  position: "relative",
  width: 12,
  height: 12,
  borderRadius: "50%",
  border: "1.5px solid rgba(10,8,20,0.4)",
  flexShrink: 0,
};
