"use client";

// PLACEHOLDER backdrop — a code-drawn mine/switch-yard stand-in (warm
// gradient + rail lines + lantern glow), not the real painted scene. Swap
// for a real background image the same way Gatekeeper's GateBackdrop
// loads /games/<slug>/backgrounds/*.png once that art exists; see this
// game's README.
const LANTERNS: [number, number][] = [
  [8, 60],
  [92, 55],
  [15, 82],
  [85, 86],
  [50, 94],
];

export function YardBackdrop() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", background: "linear-gradient(180deg, #1a1208 0%, #241a0d 45%, #140d06 100%)" }} aria-hidden>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 20%, rgba(240,166,60,0.18), transparent 55%)",
        }}
      />
      {/* simple converging rail lines toward the power station */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="none" viewBox="0 0 390 700">
        {[-60, -20, 20, 60].map((offset) => (
          <path
            key={offset}
            d={`M${195 + offset * 2.4} 700 L${195 + offset * 0.3} 260`}
            stroke="rgba(180,140,90,0.35)"
            strokeWidth={3}
            fill="none"
          />
        ))}
      </svg>
      {LANTERNS.map(([x, y], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#F0C572",
            boxShadow: "0 0 16px 6px rgba(240,166,60,0.55)",
            animation: `twinkle ${2.4 + (i % 3) * 0.5}s ease-in-out ${i * 0.3}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
