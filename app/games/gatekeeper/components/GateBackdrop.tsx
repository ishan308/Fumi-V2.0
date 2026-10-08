"use client";

import { useId } from "react";
import { GATE_CIRCLE, PLAY_AREA } from "../config";

const EMBER_POSITIONS: [number, number, number, number, string][] = [
  // x%, y%, size, delay(s), color
  [14, 20, 2, 0, "#F0C572"],
  [82, 16, 3, 0.5, "#9B5CFF"],
  [88, 55, 2, 1.2, "#F0C572"],
  [8, 62, 2, 0.8, "#9B5CFF"],
  [50, 12, 2, 1.6, "#F0C572"],
  [30, 78, 2, 0.3, "#F0C572"],
  [70, 80, 3, 1.0, "#9B5CFF"],
];

// Fixed orbit angles (degrees) for the sparks drifting around the ring —
// spread unevenly on purpose so the rotation doesn't read as a single
// rigid spoke pattern. Sized and glowed well past the painted art's own
// highlights so they read as new, moving light rather than blending into
// the already-bright carving.
const SPARK_ORBITS: { angle: number; radiusFrac: number; size: number; color: string; durationS: number; reverse?: boolean }[] = [
  { angle: 20, radiusFrac: 0.58, size: 6, color: "#FFF3D6", durationS: 14 },
  { angle: 140, radiusFrac: 0.62, size: 4.5, color: "#E4DEFC", durationS: 19, reverse: true },
  { angle: 250, radiusFrac: 0.56, size: 5, color: "#FFF3D6", durationS: 16 },
  { angle: 310, radiusFrac: 0.6, size: 4, color: "#C9A6FF", durationS: 23, reverse: true },
];

type GateBackdropProps = {
  powerStage: number; // 0..4, drives how strongly the circle + seam glow
};

// The painted stone-gate illustration, with the already-carved circle
// (see config.ts's GATE_CIRCLE — same geometry the interactive rune lands
// on) brought to life: a slow rotating energy sweep around its rim, a
// couple of sparks drifting in orbit, and the gold/violet glow precisely
// centered on the real circle instead of an approximate screen position.
// Per the game spec, this layer stays animated but non-interactive.
export function GateBackdrop({ powerStage }: GateBackdropProps) {
  const uid = useId();
  const sweepGradId = `gk-sweep-${uid}`;
  const t = Math.max(0, Math.min(1, powerStage / 4));
  const glowOpacity = 0.25 + t * 0.6;
  const seamOpacity = 0.15 + t * 0.75;
  const seamWidth = 2 + t * 7;
  const isFullyOpen = powerStage >= 4;

  const circleXPct = (GATE_CIRCLE.centerX / PLAY_AREA.width) * 100;
  const circleYPct = (GATE_CIRCLE.centerY / PLAY_AREA.height) * 100;
  // Sits just outside the artwork's own outer ring, in the plain stone
  // margin — a bright new halo reads clearly there, whereas tracing it
  // directly over the art's already-lit gold rim just blends in.
  const sweepSize = GATE_CIRCLE.outerDiameter + 34;
  const sweepStroke = 5;
  const sweepRadius = (sweepSize - sweepStroke) / 2;
  const circumference = 2 * Math.PI * sweepRadius;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: "#08090d",
      }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/games/gatekeeper/backgrounds/gate-portal.png"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "50% 20%",
          display: "block",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${circleXPct}% ${circleYPct}%, rgba(240,166,60,0.9), transparent 42%)`,
          opacity: glowOpacity,
          mixBlendMode: "screen",
          transition: "opacity 600ms ease",
        }}
      />

      {/* A slow rotating energy halo traced just outside the artwork's own
          ring — bright white-gold fading to violet, with a real glow
          (filter, not just opacity) so it unmistakably reads as new,
          moving light rather than blending into the painted highlights. */}
      <svg
        width={sweepSize}
        height={sweepSize}
        style={{
          position: "absolute",
          left: GATE_CIRCLE.centerX - sweepSize / 2,
          top: GATE_CIRCLE.centerY - sweepSize / 2,
          animation: "spin-cw 9s linear infinite",
          opacity: 0.75 + t * 0.25,
          filter: "drop-shadow(0 0 7px rgba(255,246,224,0.95)) drop-shadow(0 0 16px rgba(155,92,255,0.7))",
        }}
      >
        <defs>
          <linearGradient id={sweepGradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F0C572" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFF6E0" stopOpacity="1" />
            <stop offset="100%" stopColor="#9B5CFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx={sweepSize / 2}
          cy={sweepSize / 2}
          r={sweepRadius}
          fill="none"
          stroke={`url(#${sweepGradId})`}
          strokeWidth={sweepStroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
        />
        <circle
          cx={sweepSize / 2}
          cy={sweepSize / 2}
          r={sweepRadius}
          fill="none"
          stroke={`url(#${sweepGradId})`}
          strokeWidth={sweepStroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
          transform={`rotate(180 ${sweepSize / 2} ${sweepSize / 2})`}
        />
      </svg>

      {/* Sparks drifting in slow orbit around the circle */}
      {SPARK_ORBITS.map((spark, i) => {
        const orbitDiameter = GATE_CIRCLE.outerDiameter * spark.radiusFrac * 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: GATE_CIRCLE.centerX - orbitDiameter / 2,
              top: GATE_CIRCLE.centerY - orbitDiameter / 2,
              width: orbitDiameter,
              height: orbitDiameter,
              animation: `${spark.reverse ? "spin-ccw" : "spin-cw"} ${spark.durationS}s linear infinite`,
              transform: `rotate(${spark.angle}deg)`,
            }}
          >
            {/* comet trail behind the spark, in its direction of travel */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                width: 2,
                height: orbitDiameter * 0.16,
                marginLeft: -1,
                background: `linear-gradient(180deg, transparent, ${spark.color}aa)`,
                transform: spark.reverse ? "translateY(2px)" : `translateY(-${orbitDiameter * 0.16}px) scaleY(-1)`,
                opacity: 0.8,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                width: spark.size,
                height: spark.size,
                marginLeft: -spark.size / 2,
                marginTop: -spark.size / 2,
                borderRadius: "50%",
                background: spark.color,
                boxShadow: `0 0 ${spark.size * 2.5}px ${spark.size}px ${spark.color}`,
                animation: `twinkle ${2.2 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
              }}
            />
          </div>
        );
      })}

      {/* The gate's inner energy waking up — a violet seam down the carved
          emblem's center, widening/brightening as the block count climbs. */}
      <div
        style={{
          position: "absolute",
          left: `${circleXPct}%`,
          top: GATE_CIRCLE.centerY - GATE_CIRCLE.outerDiameter * 0.52,
          height: GATE_CIRCLE.outerDiameter * 1.04,
          width: seamWidth,
          marginLeft: -seamWidth / 2,
          background: "linear-gradient(180deg, transparent, #C4B5FD, #9B5CFF, #C4B5FD, transparent)",
          opacity: seamOpacity,
          boxShadow: `0 0 ${6 + t * 18}px rgba(155,92,255,${0.5 + t * 0.4})`,
          transition: "width 600ms var(--ease-spring), opacity 600ms ease, box-shadow 600ms ease",
        }}
      />

      {isFullyOpen && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: GATE_CIRCLE.centerX,
            top: GATE_CIRCLE.centerY,
            width: 4,
            height: 4,
            marginLeft: -2,
            marginTop: -2,
            borderRadius: "50%",
            background: "#F6F5FF",
            boxShadow: "0 0 40px 20px rgba(196,181,253,0.9)",
            animation: "glow-pulse 1.8s ease-in-out infinite",
          }}
        />
      )}

      {EMBER_POSITIONS.map(([x, y, size, delay, color], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            width: size,
            height: size,
            borderRadius: "50%",
            background: color,
            opacity: 0.55,
            boxShadow: `0 0 6px ${color}cc`,
            animation: `twinkle ${2.6 + (i % 3) * 0.5}s ease-in-out ${delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
