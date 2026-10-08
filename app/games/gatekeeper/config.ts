import type { AgeBand, PracticeTrialPlan, QuestContext, TrialKind } from "./types";

// Fixed mobile-first design surface — matches every other game's PhoneFrame.
export const PLAY_AREA = { width: 390, height: 700 };
export const SAFE_AREA_TOP = 44;

export const TOTAL_BLOCKS = 4;
export const TRIALS_PER_BLOCK = 24;
export const GO_PER_BLOCK = 19;
export const NO_GO_PER_BLOCK = 5;
export const TOTAL_TRIALS = TOTAL_BLOCKS * TRIALS_PER_BLOCK; // 96, 76 go / 20 no-go

// Gate power is driven by cumulative CORRECT Go-taps, not by trial count —
// finishing a block with errors in it does not by itself advance the
// gate. Every one of the 76 Go trials must land correctly to fully open
// it; blocks still exist underneath for difficulty-ramp/No-Go-spacing
// purposes (see sessionPlanner.ts), just not for gate power.
export const CORRECT_TILE_TARGET = GO_PER_BLOCK * TOTAL_BLOCKS; // 76
export const GATE_POWER_STAGES = [25, 50, 75, 100] as const;
export const GATE_POWER_CORRECT_THRESHOLDS = GATE_POWER_STAGES.map((pct) => Math.round((CORRECT_TILE_TARGET * pct) / 100));

// The carved circle already painted into gate-portal.png (native
// 941x1672, displayed by GateBackdrop via objectFit:"cover" /
// objectPosition "50% 20%" inside this 390x700 PLAY_AREA) — measured by
// overlaying calibration rings on the source art and converting through
// the same cover-crop math GateBackdrop uses. Lets the interactive rune
// sit exactly on top of the artwork's own circle instead of drawing a
// second, competing one. Unlike the previous background, this circle's
// center is blank stone — the Go/No-Go symbol is drawn by us (see
// GateRune + engine/symbolLibrary.ts), not baked into the art.
export const GATE_CIRCLE = {
  centerX: 195, // exact horizontal center — guaranteed by cover+50% crop since the art's circle is itself centered
  centerY: 320, // nudged further down — 308 still sat visibly above the carved circle's true center
  outerDiameter: 157, // the big glowing ring — this is the tap zone
  symbolDiameter: 100, // where the drawn Go/No-Go glyph sits, inside the blank inner circle
  innerRingDiameter: 94, // the tight carved ring bounding the blank circle — correct-tap flicker traces this
};

export type AgeTrialConfig = {
  // [easiest, hardest] — block 0 always starts at the easy end (a "stable
  // first block" for young kids falls out of this for free, no
  // special-casing needed) and ramps linearly to the hard end by the
  // final block.
  crackStrengthRange: [number, number]; // 1 = obvious break, toward 0 = subtle
  itiRange: [number, number];
  displayMs: number;
  // Fallback response window for practice's Go-kind trials only — real
  // trials use RESPONSE_WINDOW_SCHEDULE below, not this.
  practiceGoResponseWindowMs: number;
};

export const AGE_BAND_CONFIG: Record<AgeBand, AgeTrialConfig> = {
  "6-10": {
    // Short ITI on purpose — a faster rhythm builds a stronger "just tap"
    // habit, which is what makes withholding on a No-Go harder, not just
    // the visual crack subtlety.
    crackStrengthRange: [0.85, 0.55],
    itiRange: [300, 180],
    displayMs: 650,
    practiceGoResponseWindowMs: 1200,
  },
  "11-16": {
    crackStrengthRange: [0.55, 0.3],
    itiRange: [260, 150],
    displayMs: 550,
    practiceGoResponseWindowMs: 950,
  },
};

// Exact trial-number pacing for the 96 scored real trials, per spec —
// applies to every rune regardless of kind (Go runes are no longer
// untimed here: missing one in the window counts as an omission, same as
// a No-Go that's tapped counts as a commission). Same schedule for both
// age bands. Replaces the old per-age/per-block response-window ramp.
const RESPONSE_WINDOW_SCHEDULE: { throughRuneNumber: number; ms: number }[] = [
  { throughRuneNumber: 20, ms: 1150 }, // runes 1-20
  { throughRuneNumber: 50, ms: 900 }, // runes 21-50
  { throughRuneNumber: 75, ms: 750 }, // runes 51-75
  { throughRuneNumber: 96, ms: 600 }, // runes 76-96
];

export function responseWindowForTrial(trialIndex: number): number {
  const runeNumber = trialIndex + 1; // schedule is 1-based
  const tier = RESPONSE_WINDOW_SCHEDULE.find((t) => runeNumber <= t.throughRuneNumber);
  return (tier ?? RESPONSE_WINDOW_SCHEDULE[RESPONSE_WINDOW_SCHEDULE.length - 1]).ms;
}

// Practice uses each age band's easiest (block-0-equivalent) settings for
// Go trials — the point is to teach the rule, not to test reaction speed
// yet. No-Go trials get their own, much slower window and a near-maximal
// crack so there's real time to look carefully and register "this one's
// broken" before it passes, rather than reacting at real-game pace.
const PRACTICE_NO_GO_WINDOW_MS: Record<AgeBand, number> = {
  "6-10": 2800,
  "11-16": 2300,
};
const PRACTICE_NO_GO_CRACK_STRENGTH = 0.95;

export function practiceTiming(ageBand: AgeBand, kind: TrialKind) {
  const cfg = AGE_BAND_CONFIG[ageBand];
  if (kind === "no-go") {
    return {
      displayMs: cfg.displayMs,
      responseWindowMs: PRACTICE_NO_GO_WINDOW_MS[ageBand],
      crackStrength: PRACTICE_NO_GO_CRACK_STRENGTH,
    };
  }
  return {
    displayMs: cfg.displayMs,
    responseWindowMs: cfg.practiceGoResponseWindowMs,
    crackStrength: cfg.crackStrengthRange[0],
  };
}

// 3 forced Go taps, then 2 forced No-Go withholds, then 3 mixed trials run
// at real timing — 8 practice trials total, matching the spec's "8 practice".
export const PRACTICE_PLAN: Omit<PracticeTrialPlan, "crackStrength" | "displayMs" | "responseWindowMs"> [] = [
  { trialIndex: 0, blockIndex: -1, kind: "go", phase: "go-forced", symbolId: "three-leaf-branch" },
  { trialIndex: 1, blockIndex: -1, kind: "go", phase: "go-forced", symbolId: "spiral" },
  { trialIndex: 2, blockIndex: -1, kind: "go", phase: "go-forced", symbolId: "crescent" },
  { trialIndex: 3, blockIndex: -1, kind: "no-go", phase: "no-go-forced", symbolId: "double-chevron" },
  { trialIndex: 4, blockIndex: -1, kind: "no-go", phase: "no-go-forced", symbolId: "forked-twig" },
  { trialIndex: 5, blockIndex: -1, kind: "go", phase: "mixed", symbolId: "three-point-star" },
  { trialIndex: 6, blockIndex: -1, kind: "no-go", phase: "mixed", symbolId: "diamond-with-line" },
  { trialIndex: 7, blockIndex: -1, kind: "go", phase: "mixed", symbolId: "broken-circle" },
];

export const CONSECUTIVE_ERROR_REMINDER_THRESHOLD = 2;

export const CHILD_RULE_TEXT = "Tap every clean rune. If the rune is cracked by Mist, do nothing and let it pass.";

export const NARRATION_TEXT = "The Mist corrupted some signals. Tap the clean ones — leave the corrupted ones alone.";

export const DEFAULT_QUEST: QuestContext = {
  region: "Greenwood",
  city: "Fernhaven",
  questId: "the-lost-trail",
  part: "B",
};
