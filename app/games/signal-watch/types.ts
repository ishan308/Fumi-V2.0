export type AgeBand = "6-10" | "11-16";

// The three energy-signal types that appear every round — same three
// throughout, just with different per-round values (see roundLibrary.ts's
// own note on why that's enough variety without needing more types).
export type SignalType = "leaf" | "wave" | "sun";

// One authored round. `values` is this round's per-unit energy for each
// signal type; `target` is the exact total the player must build by
// picking non-negative counts of each. There is deliberately no single
// `correctOrder`-style answer key here (unlike Switch Yard Rescue) — the
// win-check is a formula (see engine/metrics.ts's sibling, the live sum in
// SignalWatchGame), since a sum-to-target puzzle usually has more than one
// valid combination of counts.
export type RoundPlan = {
  id: string;
  roundNumber: number;
  values: Record<SignalType, number>;
  target: number;
};

// "completed" once the player reaches the last round's success; "exited"
// if they left (the header's back arrow) before that.
export type GameSessionStatus = "completed" | "exited";

export type RoundResult = {
  roundNumber: number;
  target: number;
  attempts: number; // how many "Send Energy" presses before solving
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
  status: GameSessionStatus;
};

export type QuestContext = {
  region: string;
  city: string;
  questId: string;
  part: "A" | "B";
};
