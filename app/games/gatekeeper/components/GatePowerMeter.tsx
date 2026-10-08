"use client";

import { useId } from "react";
import { GATE_POWER_STAGES } from "../config";

const VIEW_W = 270;
const VIEW_H = 78;
const NODE_Y = 28;
const NODE_R = 18;
const NODE_X = [30, 100, 170, 240];
const NODE_LABELS = ["25%", "50%", "75%", "OPEN"];

// A single simple leaf silhouette (teardrop + center vein) — the same
// "leaf" motif as the gate's own carved emblem, scaled down for the OPEN
// node and the small decorative flourishes at each end of the bar.
function LeafGlyph({ cx, cy, size, gradId, lit }: { cx: number; cy: number; size: number; gradId: string; lit: boolean }) {
  const s = size / 20;
  const d = `M${cx} ${cy - 9 * s} C${cx + 6 * s} ${cy - 5 * s} ${cx + 6 * s} ${cy + 5 * s} ${cx} ${cy + 9 * s} C${cx - 6 * s} ${cy + 5 * s} ${cx - 6 * s} ${cy - 5 * s} ${cx} ${cy - 9 * s} Z`;
  const vein = `M${cx} ${cy - 7 * s} L${cx} ${cy + 7 * s}`;
  return (
    <g opacity={lit ? 1 : 0.55}>
      <path d={d} fill="none" stroke="#3A2712" strokeWidth={2.4 * s} opacity={0.6} />
      <path d={d} fill="none" stroke={`url(#${gradId})`} strokeWidth={1.4 * s} />
      <path d={vein} fill="none" stroke={`url(#${gradId})`} strokeWidth={1 * s} strokeLinecap="round" />
    </g>
  );
}

// A small curling vine flourish at each end of the bar — two leaves off a
// short stem — purely decorative framing, echoing the vines painted around
// the gate itself without attempting a literal illustration.
function VineFlourish({ x, y, flip, gradId }: { x: number; y: number; flip: boolean; gradId: string }) {
  const dir = flip ? -1 : 1;
  const stem = `M${x} ${y} q${8 * dir} 2 ${14 * dir} -6`;
  return (
    <g opacity={0.65}>
      <path d={stem} fill="none" stroke="#6B8F5A" strokeWidth={1.4} strokeLinecap="round" />
      <LeafGlyph cx={x + 8 * dir} cy={y - 7} size={9} gradId={gradId} lit />
      <LeafGlyph cx={x + 15 * dir} cy={y + 2} size={7} gradId={gradId} lit />
    </g>
  );
}

type GatePowerMeterProps = {
  stage: number; // 0..4 gate-power stages reached
  pulseKey: number; // bump this for a brief brightness flash on a correct Go
};

// Fully code-drawn — same carved-gold-on-stone technique as GateRune and
// SymbolGlyph (dark groove + gold gradient + bright highlight), not a
// cropped illustration: a connecting gold line through 4 milestone nodes,
// each lighting up with a radiant burst once its threshold is reached, the
// last one marked with the gate's own leaf glyph.
export function GatePowerMeter({ stage, pulseKey }: GatePowerMeterProps) {
  const uid = useId();
  const goldId = `gpm-gold-${uid}`;
  const burstId = `gpm-burst-${uid}`;

  const pct = stage === 0 ? 0 : GATE_POWER_STAGES[Math.min(stage, GATE_POWER_STAGES.length) - 1];
  const label = pct >= 100 ? "GATE OPEN" : pct > 0 ? `Gate Power ${pct}%` : "Gate Power";

  const [x0, , , x3] = NODE_X;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div
        style={{
          fontFamily: "var(--font-display), var(--font-body), system-ui",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.6,
          color: "var(--color-gold)",
          textShadow: "0 2px 4px rgba(0,0,0,0.6)",
        }}
      >
        {label}
      </div>
      <svg width={215} height={(215 * VIEW_H) / VIEW_W} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden>
        <defs>
          <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF0C2" />
            <stop offset="45%" stopColor="#F0A63C" />
            <stop offset="100%" stopColor="#9A5F1E" />
          </linearGradient>
          <radialGradient id={burstId}>
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="30%" stopColor="#FFE9B8" />
            <stop offset="65%" stopColor="#F0A63C" />
            <stop offset="100%" stopColor="#F0A63C" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* backing plate — the reference bar sits on its own stone ledge,
            not floating over whatever's behind it; without this it gets
            lost against the gate artwork's own gold trim at this height */}
        <rect x={4} y={2} width={VIEW_W - 8} height={VIEW_H - 4} rx={(VIEW_H - 4) / 2} fill="rgba(6,12,14,0.82)" stroke="rgba(94,234,212,0.3)" />

        {/* connecting line: dark groove, then gold — always lit, same as
            the reference design's continuous bar */}
        <line x1={x0} y1={NODE_Y} x2={x3} y2={NODE_Y} stroke="#3A2712" strokeWidth={6} opacity={0.5} />
        <line x1={x0} y1={NODE_Y} x2={x3} y2={NODE_Y} stroke={`url(#${goldId})`} strokeWidth={3} />
        {/* brief brightness flash on a correct Go, even between milestones */}
        <line
          key={pulseKey}
          x1={x0}
          y1={NODE_Y}
          x2={x3}
          y2={NODE_Y}
          stroke="#FFFFFF"
          strokeWidth={3}
          opacity={0}
          style={{ animation: pulseKey > 0 ? "power-pulse 420ms ease-out" : undefined }}
        />

        <VineFlourish x={x0 - 12} y={NODE_Y} flip gradId={goldId} />
        <VineFlourish x={x3 + 12} y={NODE_Y} flip={false} gradId={goldId} />

        {NODE_X.map((x, i) => {
          const lit = stage >= i + 1;
          const isOpen = i === 3;
          return (
            <g key={i}>
              <circle cx={x} cy={NODE_Y} r={NODE_R} fill="#15100a" stroke="#3A2712" strokeWidth={5} opacity={0.65} />
              {lit && <circle cx={x} cy={NODE_Y} r={NODE_R - 3} fill={`url(#${burstId})`} />}
              <circle
                cx={x}
                cy={NODE_Y}
                r={NODE_R}
                fill="none"
                stroke={`url(#${goldId})`}
                strokeWidth={lit ? 3 : 2}
                opacity={lit ? 1 : 0.6}
                style={lit ? { filter: "drop-shadow(0 0 4px rgba(240,166,60,0.85))" } : undefined}
              />
              {isOpen && <LeafGlyph cx={x} cy={NODE_Y} size={16} gradId={goldId} lit={lit} />}
              {lit && (
                <circle
                  cx={x}
                  cy={NODE_Y}
                  r={NODE_R + 3}
                  fill="none"
                  stroke="#FFD27A"
                  strokeWidth={1}
                  opacity={0.6}
                  style={{ animation: "bubble-pop 320ms var(--ease-pop) both" }}
                />
              )}
              <text
                x={x}
                y={NODE_Y + NODE_R + 16}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-display), var(--font-body), system-ui",
                  fontSize: 11,
                  fontWeight: 800,
                  fill: "var(--color-gold)",
                  opacity: lit ? 1 : 0.55,
                }}
              >
                {NODE_LABELS[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
