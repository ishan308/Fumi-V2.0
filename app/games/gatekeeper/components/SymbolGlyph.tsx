"use client";

import { useId } from "react";
import type { MarkVariant, SymbolDefinition } from "../types";

type SymbolGlyphProps = {
  symbol: SymbolDefinition;
  rotationDeg?: number;
  mirrored?: boolean;
  markVariant?: MarkVariant;
  markShiftDeg?: number;
  size?: number;
  strokeWidth?: number;
};

type PathSpec = { d: string; transform?: string; opacity?: number };

// Shapes copied from Pathfinder Sweep's components/SymbolGlyph.tsx — not
// imported cross-game, per this project's convention of each game folder
// being self-contained. Rendering style diverges from Pathfinder's flat
// gold-ink look on purpose: Gatekeeper's runes should read as carved into
// the gate stone and backlit, same glowing-amber-rim treatment as the
// ring/diamond ornaments elsewhere on the gate (not a drawn icon).
//
// Idle-state rendering must never branch on isTarget/similarity — every
// symbol always renders in this same carved style regardless of context.
//
// Each path draws four times — a soft blurred amber glow bleeding outward
// (the backlit rim), a dark recessed groove shadow for depth, the warm
// bronze gradient body on top, and a thin bright highlight offset toward
// the light — simulating a lit stone carving without raster assets.
export function SymbolGlyph({
  symbol,
  rotationDeg = 0,
  mirrored = false,
  markVariant = "canonical",
  markShiftDeg = 0,
  size = 40,
  strokeWidth = 6,
}: SymbolGlyphProps) {
  const uid = useId();
  const gradId = `symbol-leaf-${uid}`;
  const [vx, vy, vw, vh] = symbol.viewBox.split(" ").map(Number);
  const cx = vx + vw / 2;
  const cy = vy + vh / 2;
  // The hand-authored path data isn't drawn symmetrically about the
  // viewBox's geometric center — recenter on the measured visual content
  // center first (innermost transform), then rotate/mirror around the
  // viewBox center as before.
  const [visX, visY] = symbol.visualCenter ?? [cx, cy];
  const recenter = `translate(${cx - visX} ${cy - visY})`;
  const rigidTransform = `translate(${cx} ${cy}) rotate(${rotationDeg}) scale(${mirrored ? -1 : 1} 1) translate(${-cx} ${-cy}) ${recenter}`;

  const paths: PathSpec[] = symbol.corePaths.map((d) => ({ d }));
  if (markVariant !== "removed") {
    paths.push({ d: symbol.markPath, transform: markVariant === "shifted" ? `rotate(${markShiftDeg} ${cx} ${cy})` : undefined });
  }
  if (markVariant === "duplicated") {
    paths.push({ d: symbol.markPath, transform: `rotate(30 ${cx} ${cy}) translate(5 -4)`, opacity: 0.8 });
  }

  return (
    <svg viewBox={symbol.viewBox} width={size} height={size} aria-hidden style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF3D2" />
          <stop offset="45%" stopColor="#F0A63C" />
          <stop offset="100%" stopColor="#8A5A22" />
        </linearGradient>
      </defs>
      <g transform={rigidTransform} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="#F0C572" strokeWidth={strokeWidth + 8} opacity={0.5} style={{ filter: "blur(2.5px)" }}>
          {paths.map((p, i) => (
            <path key={i} d={p.d} transform={p.transform} opacity={p.opacity} />
          ))}
        </g>
        <g stroke="#2A1708" strokeWidth={strokeWidth + 2.5} opacity={0.6} transform="translate(0, 1.4)">
          {paths.map((p, i) => (
            <path key={i} d={p.d} transform={p.transform} opacity={p.opacity} />
          ))}
        </g>
        <g stroke={`url(#${gradId})`} strokeWidth={strokeWidth}>
          {paths.map((p, i) => (
            <path key={i} d={p.d} transform={p.transform} opacity={p.opacity} />
          ))}
        </g>
        <g stroke="#FFF8E6" strokeWidth={Math.max(1, strokeWidth * 0.3)} opacity={0.65} transform="translate(-0.6, -0.6)">
          {paths.map((p, i) => (
            <path key={i} d={p.d} transform={p.transform} opacity={p.opacity} />
          ))}
        </g>
      </g>
    </svg>
  );
}
