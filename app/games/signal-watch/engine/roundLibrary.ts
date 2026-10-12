import type { RoundPlan } from "../types";

// Authored directly from the design spec spreadsheet (Round / Leaf value /
// Wave value / Sun value / Total energy columns). The spreadsheet's own
// "Solution" column isn't carried over — it's just one example combination
// of counts, not the only one, and win-checking is a live sum-to-target
// formula rather than a match against a single answer key — but every
// round's target has been hand-verified as reachable using that solution
// before being authored here:
//   1: 2 Leaf + 1 Wave + 1 Sun = 2*2 + 1*3 + 1*5 = 12
//   2: 1 Leaf + 2 Wave + 1 Sun = 1*3 + 2*4 + 1*6 = 17
//   3: 1 Leaf + 2 Wave + 1 Sun = 1*2 + 2*5 + 1*7 = 19
//   4: 4 Leaf + 1 Wave + 1 Sun = 4*3 + 1*5 + 1*7 = 24
//   5: 1 Leaf + 3 Wave + 1 Sun = 1*4 + 3*6 + 1*9 = 31
//   6: 1 Leaf + 3 Wave + 1 Sun = 1*2 + 3*6 + 1*8 = 28
//   7: 1 Leaf + 2 Wave + 2 Sun = 1*3 + 2*7 + 2*10 = 37
//   8: 2 Leaf + 2 Wave + 2 Sun = 2*4 + 2*7 + 2*9 = 40
//   9: 1 Leaf + 2 Wave + 2 Sun = 1*5 + 2*8 + 2*11 = 43
//  10: 1 Leaf + 3 Wave + 3 Sun = 1*4 + 3*9 + 3*13 = 70
export const ROUND_LIBRARY: RoundPlan[] = [
  { id: "round-1", roundNumber: 1, values: { leaf: 2, wave: 3, sun: 5 }, target: 12 },
  { id: "round-2", roundNumber: 2, values: { leaf: 3, wave: 4, sun: 6 }, target: 17 },
  { id: "round-3", roundNumber: 3, values: { leaf: 2, wave: 5, sun: 7 }, target: 19 },
  { id: "round-4", roundNumber: 4, values: { leaf: 3, wave: 5, sun: 7 }, target: 24 },
  { id: "round-5", roundNumber: 5, values: { leaf: 4, wave: 6, sun: 9 }, target: 31 },
  { id: "round-6", roundNumber: 6, values: { leaf: 2, wave: 6, sun: 8 }, target: 28 },
  { id: "round-7", roundNumber: 7, values: { leaf: 3, wave: 7, sun: 10 }, target: 37 },
  { id: "round-8", roundNumber: 8, values: { leaf: 4, wave: 7, sun: 9 }, target: 40 },
  { id: "round-9", roundNumber: 9, values: { leaf: 5, wave: 8, sun: 11 }, target: 43 },
  { id: "round-10", roundNumber: 10, values: { leaf: 4, wave: 9, sun: 13 }, target: 70 },
];
