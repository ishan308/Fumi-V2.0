"use client";

import type { GemType } from "../types";
import { GEM_THEME } from "../config";

type GemCardProps = {
  gem: GemType;
  size?: number;
  interactive?: boolean;
  onTap?: () => void;
  shake?: boolean;
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

// One tappable gem card — used both in the palette (available gems) and,
// once placed, inside a cart slot (tap again to send it back to the
// palette). Carved-glow styling matches the rest of the app's dark,
// backlit-gem aesthetic.
export function GemCard({ gem, size = 68, interactive = true, onTap, shake = false }: GemCardProps) {
  const theme = GEM_THEME[gem];
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!interactive}
      aria-label={theme.label}
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
        padding: 0,
        cursor: interactive ? "pointer" : "default",
        animation: shake ? "shake-x 260ms ease-in-out" : undefined,
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
    </button>
  );
}
