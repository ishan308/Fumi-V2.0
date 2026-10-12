"use client";

import type { SignalType } from "../types";
import { SIGNAL_THEME } from "../config";

type SignalCounterProps = {
  type: SignalType;
  value: number; // this round's per-unit energy for this signal
  count: number;
  disabled: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
};

// Code-drawn glyphs (no raster asset yet — see this game's README) for the
// three signal types, matching the reference's leaf / spiral-wave / sun
// icon set closely enough to read at a glance without redrawing them as
// literal copies.
function SignalGlyph({ type }: { type: SignalType }) {
  if (type === "leaf") {
    return (
      <svg viewBox="0 0 40 40" width="60%" height="60%" aria-hidden>
        <path d="M20 6 C30 6 34 16 34 24 C34 32 28 36 20 36 C12 36 6 32 6 24 C6 16 10 6 20 6 Z" fill="currentColor" />
        <path d="M20 8 V34" stroke="rgba(10,8,20,0.35)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "wave") {
    return (
      <svg viewBox="0 0 40 40" width="60%" height="60%" aria-hidden>
        <path
          d="M20 6 C27 6 32 11 32 18 C32 24 27 28 22 28 C18 28 15 25 15 21.5 C15 18.5 17.3 16.5 20 16.5 C22 16.5 23.5 18 23.5 19.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" width="60%" height="60%" aria-hidden>
      <circle cx="20" cy="20" r="9" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 20 + Math.cos(rad) * 13;
        const y1 = 20 + Math.sin(rad) * 13;
        const x2 = 20 + Math.cos(rad) * 18;
        const y2 = 20 + Math.sin(rad) * 18;
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />;
      })}
    </svg>
  );
}

// One signal fountain — banner + per-unit value, an animated "flowing"
// column of energy down into a pool holding the current count, and the
// +/- stepper that drives it. Three of these sit side by side as the
// game's whole input surface.
export function SignalCounter({ type, value, count, disabled, onIncrement, onDecrement }: SignalCounterProps) {
  const theme = SIGNAL_THEME[type];
  return (
    <div style={columnStyle}>
      <div style={{ ...bannerStyle, background: theme.color }}>
        <div style={{ color: "#0a0814" }}>
          <SignalGlyph type={type} />
        </div>
      </div>
      <div style={valueLabelStyle}>= {value}</div>

      <div style={{ ...waterfallStyle, background: `linear-gradient(180deg, ${theme.glow}, ${theme.color} 70%)` }}>
        <div style={flowOverlayStyle} aria-hidden />
      </div>
      <div style={{ ...poolStyle, background: theme.color, boxShadow: `0 0 16px ${theme.glow}` }}>
        <span style={poolCountStyle}>{count}</span>
      </div>

      <div style={stepperRowStyle}>
        <button
          type="button"
          className="tap-scale"
          onClick={onDecrement}
          disabled={disabled || count <= 0}
          style={{ ...stepperButtonStyle, opacity: disabled || count <= 0 ? 0.4 : 1 }}
          aria-label={`Remove one ${theme.label}`}
        >
          −
        </button>
        <button
          type="button"
          className="tap-scale"
          onClick={onIncrement}
          disabled={disabled}
          style={{ ...stepperButtonStyle, background: "#E8822E", opacity: disabled ? 0.4 : 1 }}
          aria-label={`Add one ${theme.label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

const columnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  width: 100,
};

const bannerStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: "2px solid rgba(10,8,20,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
};

const valueLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "var(--color-lavender)",
  fontFamily: "var(--font-display), var(--font-body), system-ui",
};

const waterfallStyle: React.CSSProperties = {
  position: "relative",
  width: 34,
  height: 64,
  borderRadius: "4px 4px 2px 2px",
  overflow: "hidden",
};

// A repeating diagonal gradient animated downward reads as "energy
// flowing" without needing a real video/sprite asset.
const flowOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.35) 0px, transparent 3px, transparent 10px)",
  backgroundSize: "100% 20px",
  animation: "flow-down 900ms linear infinite",
};

const poolStyle: React.CSSProperties = {
  width: 64,
  height: 30,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: -6,
};

const poolCountStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "#0a0814",
  fontFamily: "var(--font-display), var(--font-body), system-ui",
};

const stepperRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 6,
};

const stepperButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "none",
  background: "#8B98A8",
  color: "#fff",
  fontSize: 17,
  fontWeight: 800,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};
