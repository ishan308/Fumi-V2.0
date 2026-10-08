import type { SymbolDefinition, SymbolId } from "../types";

// Copied from Pathfinder Sweep's engine/symbolLibrary.ts (same shapes) —
// not imported cross-game, per this project's convention of each game
// folder being self-contained. Gatekeeper only ever draws these at
// rotationDeg=0, mirrored=false, markVariant="canonical" (no distractor
// variants — the Mist crack, not a mark variant, is what makes a rune
// corrupted here).
//
// visualCenter is each symbol's actual drawn-content center (corePaths +
// markPath together, stroke included), measured via SVG getBBox() rather
// than assumed — the hand-authored path data is not drawn symmetrically
// about the 100x100 viewBox's geometric center (50,50), so SymbolGlyph
// recenters on this instead to put the true artwork in the middle of the
// gate's blank circle.
export const SYMBOL_LIBRARY: Record<SymbolId, SymbolDefinition> = {
  "three-leaf-branch": {
    id: "three-leaf-branch",
    viewBox: "0 0 100 100",
    corePaths: [
      "M46 88 C48 70 52 50 56 20",
      "M50 72 C40 68 34 74 38 82 C44 84 50 80 50 72 Z",
      "M53 50 C64 46 70 52 66 60 C60 64 53 58 53 50 Z",
      "M55 28 C48 24 44 28 46 34 C50 37 55 34 55 28 Z",
    ],
    markPath: "M58 52 L63 56",
    visualCenter: [52, 54],
  },
  spiral: {
    id: "spiral",
    viewBox: "0 0 100 100",
    corePaths: ["M50 50 C60 50 66 42 60 34 C52 24 36 28 32 42 C28 58 42 70 58 66 C70 62 74 48 66 38"],
    markPath: "M64 36 L70 32",
    visualCenter: [50.74, 47.61],
  },
  "double-chevron": {
    id: "double-chevron",
    viewBox: "0 0 100 100",
    corePaths: ["M30 25 L46 38 L30 51", "M46 55 L64 68 L46 81"],
    markPath: "M56 44 L60 48",
    visualCenter: [47, 53],
  },
  crescent: {
    id: "crescent",
    viewBox: "0 0 100 100",
    corePaths: ["M62 25 A28 28 0 1 0 62 79 A20 20 0 1 1 62 25 Z"],
    markPath: "M60 24 L65 19",
    visualCenter: [45.79, 49.5],
  },
  "forked-twig": {
    id: "forked-twig",
    viewBox: "0 0 100 100",
    corePaths: ["M50 85 L50 50", "M50 50 L32 22", "M50 50 L64 34"],
    markPath: "M40 36 L45 40",
    visualCenter: [48, 53.5],
  },
  "diamond-with-line": {
    id: "diamond-with-line",
    viewBox: "0 0 100 100",
    corePaths: ["M50 20 L74 50 L50 80 L26 50 Z", "M30 62 L70 38"],
    markPath: "M68 40 L74 36",
    visualCenter: [50, 50],
  },
  "three-point-star": {
    id: "three-point-star",
    viewBox: "0 0 100 100",
    corePaths: ["M50 54 L44 20", "M50 54 L78 60", "M50 54 L34 74"],
    markPath: "M76 56 L82 58",
    visualCenter: [58, 47],
  },
  "broken-circle": {
    id: "broken-circle",
    viewBox: "0 0 100 100",
    corePaths: ["M59.6 23.7 A28 28 0 1 0 76.3 40.4"],
    markPath: "M60 20 L66 16",
    visualCenter: [50, 47],
  },
};

export const ALL_SYMBOL_IDS: SymbolId[] = Object.keys(SYMBOL_LIBRARY) as SymbolId[];
