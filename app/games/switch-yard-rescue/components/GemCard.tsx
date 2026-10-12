"use client";

import type { GemType } from "../types";
import { GEM_THEME } from "../config";

type GemCardProps = {
  gem: GemType;
  size?: number;
  // Whether this card can be picked up at all right now (false once the
  // round is solved, or for the floating drag ghost which is a pure
  // visual copy with no pointer handling of its own).
  draggable?: boolean;
  // True for the card's original spot while it's mid-drag — stays in
  // place but faded, since the floating ghost is what's actually
  // following the pointer.
  dimmed?: boolean;
  shake?: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void;
};

// A simple faceted-gem glyph, code-drawn (no raster asset yet — see this
// game's README for where to drop real gem icon art once it exists). Top
// facet catches a highlight so it still reads as a cut gem, not a flat
// diamond sticker.
function GemGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" width="56%" height="56%" aria-hidden>
      <polygon points="20,4 32,15 27,36 13,36 8,15" fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
      <polygon points="20,4 32,15 20,19 8,15" fill="#ffffff" opacity={0.3} />
    </svg>
  );
}

// One draggable gem card — used both in the palette (available gems) and,
// once placed, inside a cart slot. Not clickable: picking one up is a
// pointer-down-and-drag gesture (see SwitchYardRescueGame's drag
// orchestration), dropped onto whichever cart the player chooses, same as
// Lumosity's Organic Order. Carved-glow styling matches the rest of the
// app's dark, backlit-gem aesthetic.
export function GemCard({
  gem,
  size = 68,
  draggable = true,
  dimmed = false,
  shake = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: GemCardProps) {
  const theme = GEM_THEME[gem];
  return (
    <div
      role="img"
      aria-label={theme.label}
      onPointerDown={draggable ? onPointerDown : undefined}
      onPointerMove={draggable ? onPointerMove : undefined}
      onPointerUp={draggable ? onPointerUp : undefined}
      onPointerCancel={draggable ? onPointerCancel : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        border: `2px solid ${theme.color}`,
        background: `radial-gradient(circle at 50% 32%, ${theme.glow}, rgba(10,8,20,0.92) 75%)`,
        boxShadow: `0 0 14px ${theme.glow}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        opacity: dimmed ? 0.25 : 1,
        touchAction: "none",
        userSelect: "none",
        cursor: draggable ? "grab" : "default",
        animation: shake ? "shake-x 260ms ease-in-out" : undefined,
        transition: "opacity 150ms ease",
      }}
    >
      <GemGlyph color={theme.color} />
      <span
        style={{
          fontSize: Math.max(9, size * 0.15),
          fontWeight: 800,
          color: "var(--color-soft)",
          fontFamily: "var(--font-display), var(--font-body), system-ui",
        }}
      >
        {theme.label}
      </span>
    </div>
  );
}
