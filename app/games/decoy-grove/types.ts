export type AgeBand = "6-10" | "11-16";

// Matches the spec's authored difference categories exactly — kept as a
// closed union (not a free string) so sceneLibrary.ts entries are checked
// against the real taxonomy at compile time.
export type DifferenceType =
  | "missing-object"
  | "added-object"
  | "orientation"
  | "mirrored-symbol"
  | "count"
  | "position"
  | "internal-detail"
  | "relationship"
  | "sequence";

// One tappable difference between the intact scene and the Mist copy.
// Coordinates are percentages (0-100) of the COPY image's own rendered
// box, not natural pixels — so authored data is independent of whatever
// size the image ends up displayed at. radiusPct is the tap-tolerance
// circle, also in percentage space (see SceneDuo's hit-test for the
// current simplifying assumption around non-square aspect ratios).
export type SceneDifference = {
  id: string;
  type: DifferenceType;
  xPct: number;
  yPct: number;
  radiusPct: number;
  // Fumi's broad-area hint ("Check near the bridge") — never the exact
  // answer, per the spec's character-functionality rule.
  hint: string;
};

export type ScenePlan = {
  id: string;
  // Paths under /games/decoy-grove/scenes/... — same camera angle/layout
  // for both; only the authored differences below actually differ.
  intactSrc: string;
  copySrc: string;
  // width/height of the source images — SceneDuo locks each panel's CSS
  // aspect-ratio to this so object-fit:cover never crops, which is what
  // keeps the percentage-space difference coordinates below exact. Falls
  // back to a reasonable default if omitted.
  aspectRatio?: number;
  complexity: number; // 1..N — drives difficulty-band placement/ordering
  isTutorial: boolean;
  differences: SceneDifference[];
};

export type SceneResult = {
  sceneId: string;
  complexity: number;
  totalDifferences: number;
  differencesFound: number;
  correctTaps: number;
  incorrectTaps: number;
  hintsUsed: number;
  byType: Partial<Record<DifferenceType, { total: number; found: number }>>;
  durationMs: number;
};

export type DifferenceTypeAccuracy = {
  type: DifferenceType;
  total: number;
  found: number;
  pct: number;
};

export type ComplexityAccuracy = {
  complexity: number;
  total: number;
  found: number;
  pct: number;
};

// What the finished game leaves behind — enough to render the closing
// screen and hand off every metric called for in the game spec.
export type GameOutcome = {
  sceneResults: SceneResult[];
  totalScenesPresented: number;
  scenesCompleted: number;
  completionRatePct: number;
  totalDifferencesPresented: number;
  totalDifferencesFound: number;
  differencesMissed: number;
  detectionAccuracyPct: number;
  totalTapsMade: number;
  correctTaps: number;
  incorrectAreaTaps: number;
  accuracyByType: DifferenceTypeAccuracy[];
  accuracyByComplexity: ComplexityAccuracy[];
  gameplayDurationMs: number;
  starsEarned: number;
};

export type QuestContext = {
  region: string;
  city: string;
  questId: string;
  part: "A" | "B";
};
