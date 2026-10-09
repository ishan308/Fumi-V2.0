export type AgeBand = "6-10" | "11-16";

// The six energy-gem types that appear across rounds, introduced
// gradually (Moss/River/Sunstone first, then Amethyst, then Echo, then
// Ember) — matches the spec spreadsheet's round-by-round card lists.
export type GemType = "moss" | "river" | "sunstone" | "amethyst" | "echo" | "ember";

// One authored round. `rules` are the clue sentences shown to the child
// verbatim (including compound/conditional ones like "If Amethyst is
// before Sunstone, River must be 2nd") — they're display-only text, not
// parsed; the actual win-check is a direct comparison against
// `correctOrder`, which is the authoritative solution from the spec.
export type RoundPlan = {
  id: string;
  roundNumber: number;
  cards: GemType[];
  rules: string[];
  correctOrder: GemType[];
};

export type RoundResult = {
  roundNumber: number;
  cardCount: number;
  attempts: number; // how many "Send Carts" tries before solving
  solvedFirstTry: boolean;
  durationMs: number;
};

// What the finished game leaves behind — enough to render the closing
// screen and hand off every metric worth tracking for this game.
export type GameOutcome = {
  roundResults: RoundResult[];
  totalRoundsPresented: number;
  roundsCompleted: number;
  completionRatePct: number;
  perfectRounds: number; // solved on the very first attempt
  totalAttempts: number;
  avgAttemptsPerRound: number;
  gameplayDurationMs: number;
  starsEarned: number;
};

export type QuestContext = {
  region: string;
  city: string;
  questId: string;
  part: "A" | "B";
};
