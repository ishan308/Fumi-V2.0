"use client";

import { useMemo } from "react";
import type { SymbolId, TrialKind } from "../types";
import { GATE_CIRCLE } from "../config";
import { SYMBOL_LIBRARY } from "../engine/symbolLibrary";
import { SymbolGlyph } from "./SymbolGlyph";

export type RuneOutcome = "go-sent" | "go-missed" | "no-go-passed" | "no-go-tapped" | null;

type GateRuneProps = {
  kind: TrialKind;
  symbolId: SymbolId; // which glyph to draw — the gate's own circle is blank stone now
  crackStrength: number; // 0..1, only meaningful when kind === "no-go"
  outcome: RuneOutcome;
  interactive: boolean;
  onTap: () => void;
  size?: number; // tap-zone diameter
  symbolSize?: number; // glyph + crack-overlay diameter, centered within the tap zone
  innerRingSize?: number; // diameter of the artwork's own ring around the blank circle — correct-tap flicker traces this
};

// Evenly spaced (not randomized) so the correct-tap spark burst is
// deterministic and never jitters on an unrelated re-render while visible.
const CORRECT_SPARK_ANGLES = [0, 60, 120, 180, 240, 300];

const CENTER = 50;
// Straight up — the artwork's leaf glyph has an upper lobe plus two lower
// side lobes; the Mist crack always breaks the upper one, kept fixed
// rather than randomized so the diagnostic feature always sits in the
// same, learnable spot.
const CRACK_ANGLE_DEG = -90;
const CRACK_MID_R = 27;

function polar(radius: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

type Pt = [number, number];

function unitDir(points: Pt[], i: number): Pt {
  const prev = points[Math.max(0, i - 1)];
  const next = points[Math.min(points.length - 1, i + 1)];
  const dx = next[0] - prev[0];
  const dy = next[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

// A variable-width stroke built as a filled polygon (left offset points +
// reversed right offset points) rather than a stroked line — this is what
// lets the fracture taper to real points at its tips instead of reading as
// a uniform-width bar.
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
  const fmt = (p: Pt) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  const forward = left.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p)}`).join(" ");
  const backward = right
    .slice()
    .reverse()
    .map((p) => `L${fmt(p)}`)
    .join(" ");
  return `${forward} ${backward} Z`;
}

type CrackGeometry = { main: string; branch: string; highlight: string };

// A real fracture, not a lightning-bolt zigzag: a tapering main split
// (wide in the middle, pointed at both tips) running along the lobe, a
// thinner branch snapping off its middle kink (cracks rarely run as one
// clean line), and a highlight sliver offset slightly up-left tracing the
// same spine — the same "dark groove + offset light catching the edge"
// bevel trick used for the stone cracks elsewhere in this app, so it
// reads as a genuine broken edge rather than a drawn line. Longer, wider,
// and more jagged as crackStrength rises toward 1.
function buildCrack(crackStrength: number): CrackGeometry {
  const [cx, cy] = polar(CRACK_MID_R, CRACK_ANGLE_DEG);
  const alongRad = (CRACK_ANGLE_DEG * Math.PI) / 180;
  const acrossRad = alongRad + Math.PI / 2;
  const [ax, ay] = [Math.cos(alongRad), Math.sin(alongRad)];
  const [bx, by] = [Math.cos(acrossRad), Math.sin(acrossRad)];

  const length = 11 + crackStrength * 8; // total travel along the lobe
  const kink = 2.5 + crackStrength * 3; // how far the spine zigzags side to side

  const toXY = ([u, v]: Pt): Pt => [cx + u * length * ax + v * kink * bx, cy + u * length * ay + v * kink * by];

  const spineFrac: Pt[] = [
    [-0.5, 0.15],
    [-0.2, -1],
    [0.05, 0.4],
    [0.3, -0.85],
    [0.5, 0.1],
  ];
  const spine = spineFrac.map(toXY);

  const baseHalfWidth = 0.9 + crackStrength * 1.4;
  const mainWidths = [0, baseHalfWidth, baseHalfWidth * 1.25, baseHalfWidth * 0.85, 0];
  const main = taperedRibbonPath(spine, mainWidths);

  const highlightSpine: Pt[] = spine.map(([x, y]) => [x - 0.5, y - 0.5]);
  const highlight = taperedRibbonPath(
    highlightSpine,
    mainWidths.map((w) => w * 0.4)
  );

  // Branches off the main fracture's middle kink, angling further outward
  // and tapering to nothing.
  const branchFrac: Pt[] = [
    [0.05, 0.4],
    [0.16, 1.3],
    [0.24, 1.95],
  ];
  const branchSpine = branchFrac.map(toXY);
  const branchBase = baseHalfWidth * 0.6;
  const branch = taperedRibbonPath(branchSpine, [branchBase, branchBase * 0.55, 0]);

  return { main, branch, highlight };
}

// The gate's outer ring is already painted into the background art (see
// GateBackdrop + config.ts's GATE_CIRCLE) — this component draws a large
// invisible tap zone sized to that circle, the Go/No-Go symbol glyph
// itself (the circle's center is blank stone in the art), and, for a
// No-Go rune only, a crack overlay on top.
export function GateRune({
  kind,
  symbolId,
  crackStrength,
  outcome,
  interactive,
  onTap,
  size = GATE_CIRCLE.outerDiameter,
  symbolSize = GATE_CIRCLE.symbolDiameter,
  innerRingSize = GATE_CIRCLE.innerRingDiameter,
}: GateRuneProps) {
  const crack = useMemo(() => (kind === "no-go" ? buildCrack(crackStrength) : null), [kind, crackStrength]);
  // The correct/commission flash must fully cover the glyph it's flagging —
  // sized off whichever of the two is actually bigger, plus a margin, so it
  // reads as "this whole rune lit up red/green" rather than a ring peeking
  // out from behind the artwork.
  const flashSize = Math.max(innerRingSize, symbolSize) + 14;

  const glowAnimation =
    outcome === "go-sent"
      ? "rune-burst 480ms ease-out"
      : outcome === "no-go-tapped"
        ? "rune-flicker 420ms ease-in-out"
        : outcome === "go-missed"
          ? "tile-dissolve 420ms ease-in forwards"
          : outcome === "no-go-passed"
            ? "shield-pulse 500ms ease-out"
            : undefined;

  return (
    <button
      type="button"
      aria-label={kind === "go" ? "clean rune" : "corrupted rune"}
      disabled={!interactive}
      onClick={onTap}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        padding: 0,
        border: "none",
        background: "none",
        cursor: interactive ? "pointer" : "default",
        touchAction: "manipulation",
        overflow: "visible",
        // A real jolt, not just a color change — the whole rune recoils
        // when the Mist's corruption is touched.
        animation: outcome === "no-go-tapped" ? "shake-x 260ms ease-in-out" : undefined,
      }}
    >
      {/* feedback glow — invisible at rest, animates in on resolution */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(240,166,60,0.55), transparent 70%)",
          opacity: outcome ? undefined : 0,
          animation: glowAnimation,
        }}
      />

      {/* The gate's circle is blank stone now (no baked-in leaf) — this is
          the actual Go/No-Go stimulus, drawn in the same carved-gold style
          as everything else. Symbol varies per trial (see
          engine/symbolLibrary.ts, copied from Pathfinder Sweep); the crack
          overlay below is completely unchanged and simply layers on top of
          whichever glyph is showing. */}
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
        <SymbolGlyph symbol={SYMBOL_LIBRARY[symbolId]} size={symbolSize} strokeWidth={Math.max(6, symbolSize * 0.14)} />
      </div>

      {crack && (
        <svg
          viewBox="0 0 100 100"
          width={symbolSize}
          height={symbolSize}
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            overflow: "visible",
            // The corruption visibly reacts to a wrong touch — same
            // brightness-flicker filter as the rune's own glow.
            animation: outcome === "no-go-tapped" ? "rune-flicker 420ms ease-in-out" : undefined,
          }}
        >
          {/* Mist energy seeping from the break — soft violet glow sitting
              beneath the fissure, not drawn as its own crisp line; flares
              up on a wrong tap, as if the touch fed it. */}
          <g opacity={outcome === "no-go-tapped" ? 0.7 : 0.25 + crackStrength * 0.2} style={{ filter: `blur(${1 + crackStrength}px)` }}>
            <path d={crack.main} fill="#9B5CFF" />
            <path d={crack.branch} fill="#9B5CFF" />
          </g>

          {/* the actual fissure — a real tapered gap split into the gold
              leaf, not a line drawn on top of it */}
          <path d={crack.main} fill="#000000" />
          <path d={crack.branch} fill="#000000" />

          {/* light catching the broken edge, offset up-left like the
              StoneCracks bevel trick used for the forest tiles */}
          <path d={crack.highlight} fill="#FFE9C2" opacity={0.4 + crackStrength * 0.2} />
        </svg>
      )}

      {/* correct-tap burst, drawn ON TOP of the glyph/crack (not behind
          them) so it actually reads as the whole rune lighting up green —
          same green used for "correct" everywhere else in the app (see
          Pathfinder Sweep's HexTile): a flash flood + sparks. */}
      {outcome === "go-sent" && (
        <>
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: flashSize,
              height: flashSize,
              marginLeft: -flashSize / 2,
              marginTop: -flashSize / 2,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(168,255,200,0.9), rgba(61,220,132,0.4) 55%, transparent 75%)",
              mixBlendMode: "screen",
              animation: "inner-flash-pulse 550ms ease-out forwards",
            }}
          />
          {CORRECT_SPARK_ANGLES.map((deg) => (
            <div
              key={deg}
              aria-hidden
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 0,
                height: 0,
                transform: `rotate(${deg}deg) translateY(-${flashSize * 0.42}px)`,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#A8FFC8",
                  boxShadow: "0 0 6px rgba(168,255,200,0.9)",
                  animation: "float-up-fade 550ms ease-out both",
                }}
              />
            </div>
          ))}
        </>
      )}

      {/* commission-error flash, likewise drawn ON TOP of the glyph/crack —
          same red used for "incorrect" everywhere else in the app (see
          Pathfinder Sweep's HexTile), so tapping a corrupted rune reads as
          unambiguously wrong, not just a generic amber flicker. */}
      {outcome === "no-go-tapped" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: flashSize,
            height: flashSize,
            marginLeft: -flashSize / 2,
            marginTop: -flashSize / 2,
            borderRadius: "50%",
            // Normal blending, not "screen" — screen only lightens, and red
            // screened onto this warm gold background just washes out to a
            // pale non-red glow instead of reading as red.
            background: "radial-gradient(circle, rgba(255,60,50,0.95), rgba(180,20,20,0.85) 55%, transparent 78%)",
            animation: "inner-flash-pulse 420ms ease-out forwards",
          }}
        />
      )}
    </button>
  );
}
