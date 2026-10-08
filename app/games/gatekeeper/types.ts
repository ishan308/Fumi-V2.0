export type AgeBand = "6-10" | "11-16";

export type TrialKind = "go" | "no-go";

// Same shape as Pathfinder Sweep's symbol system (engine/symbolLibrary.ts)
// — copied, not imported cross-game, per this project's convention of each
// game folder being fully self-contained. Gatekeeper only ever renders the
// "canonical" mark (no removed/duplicated/shifted distractor variants);
// MarkVariant is kept only because SymbolGlyph's prop signature needs it.
export type SymbolId =
  | "three-leaf-branch"
  | "spiral"
  | "double-chevron"
  | "crescent"
  | "forked-twig"
  | "diamond-with-line"
  | "three-point-star"
  | "broken-circle";

export type SymbolDefinition = {
  id: SymbolId;
  viewBox: string;
  corePaths: string[];
  markPath: string;
  // Measured (via SVG getBBox()) visual-content center — the hand-authored
  // path data isn't drawn symmetrically about the viewBox's geometric
  // center, so centering on that geometric center puts a different,
  // symbol-specific offset error into every glyph. Defaults to the viewBox
  // center when omitted.
  visualCenter?: [number, number];
};

export type MarkVariant = "canonical" | "removed" | "duplicated" | "shifted";

// Real trials belong to one of the 4 narrative blocks (0-3); practice
// trials use -1 since they never count toward gate power or scoring.
export type PracticePhase = "go-forced" | "no-go-forced" | "mixed";

export type TrialPlan = {
  trialIndex: number;
  blockIndex: number;
  kind: TrialKind;
  symbolId: SymbolId; // which glyph is drawn on the rune this trial
  crackStrength: number; // 0..1, only meaningful when kind === "no-go"
  displayMs: number;
  responseWindowMs: number;
};

export type PracticeTrialPlan = TrialPlan & {
  phase: PracticePhase;
};

export type TrialOutcome = "correct-go" | "correct-no-go" | "commission" | "omission";

export type TrialResult = {
  trialIndex: number;
  blockIndex: number;
  kind: TrialKind;
  outcome: TrialOutcome;
  reactionTimeMs: number | null;
};

export type QuestContext = {
  region: string;
  city: string;
  questId: string;
  part: "A" | "B";
};

// What the finished game leaves behind: enough to render the closing screen
// and to hand off every metric called for in the game spec.
export type GameOutcome = {
  trialResults: TrialResult[];
  totalCleanPresented: number;
  correctCleanTapped: number;
  cleanAccuracyPct: number;
  corruptedTapped: number; // commission errors
  cleanMissed: number; // omission errors
  avgResponseTimeMs: number | null;
  gameplayDurationMs: number;
  starsEarned: number;
};
