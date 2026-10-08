"use client";

import { useMemo } from "react";
import { GATE_CIRCLE, PLAY_AREA } from "../config";

type Pt = [number, number];

function unitDir(points: Pt[], i: number): Pt {
  const prev = points[Math.max(0, i - 1)];
  const next = points[Math.min(points.length - 1, i + 1)];
  const dx = next[0] - prev[0];
  const dy = next[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

// Same variable-width-stroke-as-filled-polygon technique as the rune's own
// crack (see GateRune.tsx) — lets each fissure taper to a real point at
// its tip instead of reading as a uniform-width bar.
function taperedRibbonPath(points: Pt[], halfWidths: number[]): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  points.forEach((p, i) => {
    const [dx, dy] = unitDir(points, i);
    const nx = -dy;
    const ny = dx;
    const hw = halfWidths[i];
    left.push([p[0] + nx * hw, p[1] + ny * hw]);
    right.push([p[0] - nx * hw, p[1] - ny * hw]);
  });
  const fmt = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const forward = left.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p)}`).join(" ");
  const backward = right
    .slice()
    .reverse()
    .map((p) => `L${fmt(p)}`)
    .join(" ");
  return `${forward} ${backward} Z`;
}

// The jagged spine of one fissure: from the gate's center out toward a
// point near the circle's own rim (not the screen edge), with small
// zigzag kinks (finer and tighter near the tip than near the gate) so it
// reads as a real crack finding its way across the stone, not a smooth
// curve or a straight ruler-line.
function buildSpine(target: Pt, segments: number, seedOffset: number): Pt[] {
  const origin: Pt = [GATE_CIRCLE.centerX, GATE_CIRCLE.centerY];
  const dirX = target[0] - origin[0];
  const dirY = target[1] - origin[1];
  const len = Math.hypot(dirX, dirY) || 1;
  const px = -dirY / len;
  const py = dirX / len;

  const points: Pt[] = [origin];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const baseX = origin[0] + dirX * t;
    const baseY = origin[1] + dirY * t;
    const jitterMag = (1 - t) * 2.2 + 1.2;
    const jitterSign = (i + seedOffset) % 2 === 0 ? 1 : -1;
    points.push([baseX + px * jitterMag * jitterSign, baseY + py * jitterMag * jitterSign]);
  }
  return points;
}

function taper(points: Pt[], baseWidth: number): number[] {
  return points.map((_, i) => baseWidth * Math.pow(1 - i / (points.length - 1), 1.5));
}

type ScreenCrackProps = {
  crackStrength: number; // 0..1
};

// A dramatic extension of the rune's own crack, confined to the gate's
// carved circle — several thin jagged fissures radiating out from the
// center toward the circle's own rim (never past it), so the Mist's
// corruption reads as splitting open the whole medallion, not just a
// small blemish on the leaf glyph, without bleeding onto the surrounding
// stone/vines artwork. Same three-layer treatment as the close-up crack
// (violet Mist glow beneath, dark fissure fill, light-catching highlight)
// — critically, the highlight is a much *thinner* sliver than the
// fissure itself, or it washes the whole shape out into a flat band.
export function ScreenCrack({ crackStrength }: ScreenCrackProps) {
  const clipR = (GATE_CIRCLE.outerDiameter / 2) * 0.94;

  const fissures = useMemo(() => {
    const targetRadius = (GATE_CIRCLE.outerDiameter / 2) * 0.82;
    // 5-point star spread, one arm continuing straight up from the
    // leaf's own broken vein for visual continuity with the close-up crack.
    const angles = [-90, -18, 54, 126, 198];
    const targets: Pt[] = angles.map((deg) => {
      const rad = (deg * Math.PI) / 180;
      return [GATE_CIRCLE.centerX + targetRadius * Math.cos(rad), GATE_CIRCLE.centerY + targetRadius * Math.sin(rad)];
    });
    const baseWidth = 2.2 + crackStrength * 1.5;
    return targets.map((target, i) => {
      const spine = buildSpine(target, 6 + (i % 3), i * 3);
      return {
        main: taperedRibbonPath(spine, taper(spine, baseWidth)),
        highlight: taperedRibbonPath(
          spine.map(([x, y]): Pt => [x - 0.7, y - 0.7]),
          taper(spine, baseWidth * 0.3)
        ),
      };
    });
  }, [crackStrength]);

  return (
    <svg
      width={PLAY_AREA.width}
      height={PLAY_AREA.height}
      viewBox={`0 0 ${PLAY_AREA.width} ${PLAY_AREA.height}`}
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 8 }}
    >
      <defs>
        <clipPath id="gk-screen-crack-clip">
          <circle cx={GATE_CIRCLE.centerX} cy={GATE_CIRCLE.centerY} r={clipR} />
        </clipPath>
      </defs>
      <g clipPath="url(#gk-screen-crack-clip)">
        <g opacity={0.2 + crackStrength * 0.15} style={{ filter: "blur(1.5px)" }}>
          {fissures.map((f, i) => (
            <path key={`glow-${i}`} d={f.main} fill="#9B5CFF" />
          ))}
        </g>
        {fissures.map((f, i) => (
          <path key={`fissure-${i}`} d={f.main} fill="#000000" />
        ))}
        {fissures.map((f, i) => (
          <path key={`hi-${i}`} d={f.highlight} fill="#FFE9C2" opacity={0.35 + crackStrength * 0.15} />
        ))}
      </g>
    </svg>
  );
}
