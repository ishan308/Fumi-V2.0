import type { RoundPlan } from "../types";

// Authored directly from the design spec spreadsheet (Round / Cards /
// Rules / Correct order columns) — correctOrder is the given answer key,
// used as-is for the win-check rather than re-derived from the rules at
// runtime. rules are shown to the child verbatim, including compound/
// conditional ones (e.g. round 9's "If Ruby is before Coral, Topaz
// must be 2nd") — display-only text, not parsed. Every round's
// correctOrder has been hand-checked against its own rules.
export const ROUND_LIBRARY: RoundPlan[] = [
  {
    id: "round-1",
    roundNumber: 1,
    cards: ["moss", "river", "sunstone"],
    rules: ["Diamond comes before Topaz.", "Coral is last."],
    correctOrder: ["moss", "river", "sunstone"],
  },
  {
    id: "round-2",
    roundNumber: 2,
    cards: ["moss", "river", "sunstone", "amethyst"],
    rules: ["Topaz comes 2nd.", "Coral comes immediately after Topaz.", "Diamond comes before Ruby."],
    correctOrder: ["moss", "river", "sunstone", "amethyst"],
  },
  {
    id: "round-3",
    roundNumber: 3,
    cards: ["moss", "river", "sunstone", "amethyst"],
    rules: ["Diamond sits beside Coral.", "Diamond comes before Coral.", "Ruby is last.", "Topaz comes before Diamond."],
    correctOrder: ["river", "moss", "sunstone", "amethyst"],
  },
  {
    id: "round-4",
    roundNumber: 4,
    cards: ["moss", "river", "sunstone", "amethyst", "echo"],
    rules: ["Emerald is 3rd.", "Topaz is 1st.", "Coral comes immediately after Diamond."],
    correctOrder: ["river", "amethyst", "echo", "moss", "sunstone"],
  },
  {
    id: "round-5",
    roundNumber: 5,
    cards: ["moss", "river", "sunstone", "amethyst", "echo"],
    rules: [
      "Topaz is 1st.",
      "Coral sits beside Emerald.",
      "Coral comes before Emerald.",
      "Diamond comes before Coral.",
      "Ruby comes after Emerald.",
    ],
    correctOrder: ["river", "moss", "sunstone", "echo", "amethyst"],
  },
  {
    id: "round-6",
    roundNumber: 6,
    cards: ["moss", "river", "sunstone", "amethyst", "echo"],
    rules: ["Coral cannot be 1st.", "Diamond is 3rd.", "Emerald comes immediately after Topaz.", "Coral comes before Topaz."],
    correctOrder: ["amethyst", "sunstone", "moss", "river", "echo"],
  },
  {
    id: "round-7",
    roundNumber: 7,
    cards: ["moss", "river", "sunstone", "amethyst", "echo", "ember"],
    rules: ["Emerald is 2nd.", "Diamond comes immediately after Emerald.", "Topaz comes before Coral.", "Ruby is 5th.", "Ember is last."],
    correctOrder: ["river", "echo", "moss", "sunstone", "amethyst", "ember"],
  },
  {
    id: "round-8",
    roundNumber: 8,
    cards: ["moss", "river", "sunstone", "amethyst", "echo", "ember"],
    rules: [
      "Coral is 4th.",
      "Diamond sits beside Emerald.",
      "Diamond comes before Emerald.",
      "Topaz comes before Diamond.",
      "Ember comes immediately after Coral.",
    ],
    correctOrder: ["river", "moss", "echo", "sunstone", "ember", "amethyst"],
  },
  {
    id: "round-9",
    roundNumber: 9,
    cards: ["moss", "river", "sunstone", "amethyst", "echo", "ember"],
    rules: [
      "Topaz comes before Ruby.",
      "Ruby comes before Diamond.",
      "Diamond comes before Coral.",
      "Ember comes immediately after Diamond.",
      "If Ruby is before Coral, Topaz must be 2nd.",
    ],
    correctOrder: ["echo", "river", "amethyst", "moss", "ember", "sunstone"],
  },
  {
    id: "round-10",
    roundNumber: 10,
    cards: ["moss", "river", "sunstone", "amethyst", "echo", "ember"],
    rules: [
      "Diamond comes immediately after Topaz.",
      "Diamond comes before Emerald.",
      "Emerald comes before Ruby.",
      "Ruby cannot be last.",
      "Ember cannot be 2nd.",
      "If Topaz comes before Diamond, Coral must be 4th.",
    ],
    correctOrder: ["river", "moss", "echo", "sunstone", "amethyst", "ember"],
  },
];
