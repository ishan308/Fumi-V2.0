"use client";

type FumiPortraitProps = {
  size?: number;
};

// The painted mascot cutout (distinct from the code-drawn SVG <Fumi/>) —
// used for the "hero" beat on each game's region-intro screen. Shared
// across every game since it's the same character, not per-game art.
export function FumiPortrait({ size = 168 }: FumiPortraitProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mascot/fumi.png"
      alt="Fumi"
      style={{
        width: size,
        height: "auto",
        display: "block",
        filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.45))",
        animation: "float-y 3.2s ease-in-out infinite",
      }}
    />
  );
}
