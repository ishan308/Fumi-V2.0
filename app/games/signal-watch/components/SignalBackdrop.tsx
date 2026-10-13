"use client";

type SignalBackdropProps = {
  // "sky" (region-intro): just the night sky/treeline band, no baked-in
  // UI — this game's own GameTitleBanner/narration render on top of it.
  // "full" (playing screen): the complete painted scene, fountains/cards/
  // buttons and all — this screen's own UI is just the dynamic numbers
  // and invisible hit-targets layered on top of that pre-drawn chrome,
  // positioned to match it, rather than drawing competing chrome of its
  // own (see SignalWatchGame's playing-screen overlay positions).
  variant?: "sky" | "full";
};

// The real painted night-river scene (source art 941x1672, 0.563 ratio —
// close enough to the 390x700 play area that object-fit: cover crops
// almost nothing).
export function SignalBackdrop({ variant = "sky" }: SignalBackdropProps) {
  const src = variant === "full" ? "/games/signal-watch/backgrounds/signal-bg-full.jpeg" : "/games/signal-watch/backgrounds/signal-bg.jpeg";
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}
