"use client";

type EnergyMeterProps = {
  loaded: number;
  target: number;
};

// The running total readout — neutral while still under target, a warm
// amber once the player's overshot it (a nudge to back off rather than an
// error state, since Send Energy still just shakes rather than punishing),
// and a confident green the instant it matches exactly.
export function EnergyMeter({ loaded, target }: EnergyMeterProps) {
  const state = loaded === target ? "match" : loaded > target ? "over" : "under";
  const color = state === "match" ? "#5FBE63" : state === "over" ? "#E8822E" : "var(--color-soft)";

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>Energy Loaded</div>
      <div style={{ ...valueStyle, color }}>
        {loaded} <span style={slashStyle}>/ {target}</span>
      </div>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  padding: "10px 20px",
  borderRadius: 16,
  background: "rgba(10,8,20,0.78)",
  border: "1px solid rgba(240,166,60,0.35)",
  boxShadow: "0 8px 18px rgba(0,0,0,0.4)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "var(--color-lavender)",
  opacity: 0.85,
};

const valueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  transition: "color 200ms ease",
};

const slashStyle: React.CSSProperties = {
  fontSize: 14,
  opacity: 0.6,
};
