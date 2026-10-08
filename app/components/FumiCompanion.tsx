"use client";

import { Fumi, type FumiMood } from "./Fumi";
import { FumiPortrait } from "./FumiPortrait";

type FumiCompanionProps = {
  mood?: FumiMood;
  size?: number;
  line?: string | null;
  left?: number;
  top?: number;
  bottom?: number;
  tailWag?: boolean;
  // "sprite" (default) is the small code-drawn SVG used for in-game
  // reactive moments; "portrait" is the same painted mascot used for the
  // region-intro "hero" beat, for screens that want that warmer look
  // (e.g. a tutorial) without redrawing the bubble/positioning logic.
  variant?: "sprite" | "portrait";
  // Horizontally centers the whole block (bubble + character) regardless
  // of its content width, instead of pinning its left edge via `left` —
  // for screens that want Fumi centered under a centered focal point
  // (e.g. directly below the gate) rather than anchored to a corner.
  center?: boolean;
};

export function FumiCompanion({ mood = "happy", size = 96, line, left, top, bottom, tailWag, variant = "sprite", center = false }: FumiCompanionProps) {
  // Only pin absolutely when the caller actually supplies a position — used
  // as a floating overlay during gameplay (left/bottom/center passed) vs.
  // inline in normal document flow (e.g. the summary screen), which needs
  // real flow-height so it doesn't overlap whatever renders after it.
  const isPositioned = left !== undefined || top !== undefined || bottom !== undefined || center;

  return (
    <div
      style={{
        position: isPositioned ? "absolute" : "relative",
        left: center ? "50%" : left,
        top,
        bottom,
        transform: center ? "translateX(-50%)" : undefined,
        zIndex: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: center ? "center" : "flex-start",
        gap: 6,
        // Fumi is purely reactive/decorative here — never itself tappable —
        // and must never block taps on a hex tile that happens to render
        // underneath this corner.
        pointerEvents: "none",
      }}
    >
      {line && (
        <div
          style={{
            position: "relative",
            maxWidth: 220,
            background: "rgba(246,245,255,0.96)",
            color: "var(--color-ink)",
            borderRadius: 16,
            padding: "8px 12px",
            fontFamily: "var(--font-body), system-ui",
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1.35,
            textAlign: center ? "center" : "left",
            boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            animation: "bubble-pop 260ms var(--ease-pop) both",
          }}
        >
          {line}
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: center ? "50%" : 24,
              marginLeft: center ? -6 : undefined,
              width: 12,
              height: 12,
              background: "rgba(246,245,255,0.96)",
              transform: "rotate(45deg)",
            }}
          />
        </div>
      )}
      {variant === "portrait" ? <FumiPortrait size={size} /> : <Fumi mood={mood} size={size} animate tailWag={tailWag} />}
    </div>
  );
}
