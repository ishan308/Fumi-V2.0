import type { RoundPlan } from "../types";

// Authored directly from the design spec spreadsheet (Round / Cards /
// Rules / Correct order columns) — correctOrder is the given answer key,
// used as-is for the win-check rather than re-derived from the rules at
// runtime. rules are shown to the child verbatim, including compound/
// conditional ones (e.g. round 9's "If Amethyst is before Sunstone, River
// must be 2nd") — display-only text, not parsed. Every round's
// correctOrder has been hand-checked against its own rules.
export const ROUND_LIBRARY: RoundPlan[] = [
  {
    id: "round-1",
    roundNumber: 1,
    cards: ["moss", "river", "sunstone"],
    rules: ["Moss comes before River.", "Sunstone is last."],
    correctOrder: ["moss", "river", "sunstone"],
  },
  {
    id: "round-2",
    roundNumber: 2,
    cards: ["moss", "river", "sunstone", "amethyst"],
    rules: ["River comes 2nd.", "Sunstone comes immediately after River.", "Moss comes before Amethyst."],
    correctOrder: ["moss", "river", "sunstone", "amethyst"],
  },
  {
    id: "round-3",
    roundNumber: 3,
    cards: ["moss", "river", "sunstone", "amethyst"],
    rules: ["Moss sits beside Sunstone.", "Moss comes before Sunstone.", "Amethyst is last.", "River comes before Moss."],
    correctOrder: ["river", "moss", "sunstone", "amethyst"],
  },
  {
    id: "round-4",
    roundNumber: 4,
    cards: ["moss", "river", "sunstone", "amethyst", "echo"],
    rules: ["Echo is 3rd.", "River is 1st.", "Sunstone comes immediately after Moss."],
    correctOrder: ["river", "amethyst", "echo", "moss", "sunstone"],
  },
  {
    id: "round-5",
    roundNumber: 5,
    cards: ["moss", "river", "sunstone", "amethyst", "echo"],
    rules: [
      "River is 1st.",
      "Sunstone sits beside Echo.",
      "Sunstone comes before Echo.",
      "Moss comes before Sunstone.",
      "Amethyst comes after Echo.",
    ],
    correctOrder: ["river", "moss", "sunstone", "echo", "amethyst"],
  },
  {
    id: "round-6",
    roundNumber: 6,
    cards: ["moss", "river", "sunstone", "amethyst", "echo"],
    rules: ["Sunstone cannot be 1st.", "Moss is 3rd.", "Echo comes immediately after River.", "Sunstone comes before River."],
    correctOrder: ["amethyst", "sunstone", "moss", "river", "echo"],
  },
  {
    id: "round-7",
    roundNumber: 7,
    cards: ["moss", "river", "sunstone", "amethyst", "echo", "ember"],
    rules: ["Echo is 2nd.", "Moss comes immediately after Echo.", "River comes before Sunstone.", "Amethyst is 5th.", "Ember is last."],
    correctOrder: ["river", "echo", "moss", "sunstone", "amethyst", "ember"],
  },
  {
    id: "round-8",
    roundNumber: 8,
    cards: ["moss", "river", "sunstone", "amethyst", "echo", "ember"],
    rules: [
      "Sunstone is 4th.",
      "Moss sits beside Echo.",
      "Moss comes before Echo.",
      "River comes before Moss.",
      "Ember comes immediately after Sunstone.",
    ],
    correctOrder: ["river", "moss", "echo", "sunstone", "ember", "amethyst"],
  },
  {
    id: "round-9",
    roundNumber: 9,
    cards: ["moss", "river", "sunstone", "amethyst", "echo", "ember"],
    rules: [
      "River comes before Amethyst.",
      "Amethyst comes before Moss.",
      "Moss comes before Sunstone.",
      "Ember comes immediately after Moss.",
      "If Amethyst is before Sunstone, River must be 2nd.",
    ],
    correctOrder: ["echo", "river", "amethyst", "moss", "ember", "sunstone"],
  },
  {
    id: "round-10",
    roundNumber: 10,
    cards: ["moss", "river", "sunstone", "amethyst", "echo", "ember"],
    rules: [
      "Moss comes immediately after River.",
      "Moss comes before Echo.",
      "Echo comes before Amethyst.",
      "Amethyst cannot be last.",
      "Ember cannot be 2nd.",
      "If River comes before Moss, Sunstone must be 4th.",
    ],
    correctOrder: ["river", "moss", "echo", "sunstone", "amethyst", "ember"],
  },
];
