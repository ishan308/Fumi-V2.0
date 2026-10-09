import type { AgeBand, QuestContext } from "./types";

// Fixed mobile-first design surface — matches every other game's PhoneFrame.
export const PLAY_AREA = { width: 390, height: 700 };
export const SAFE_AREA_TOP = 44;

// Per spec: "6 scored scenes after tutorial", recommended difference-count
// progression 4 -> 5 -> 6 -> 7 -> 8 -> 8-10 as scene complexity/similarity
// increases. This is the target shape to author real scenes toward — the
// session planner just plays whatever scenes sceneLibrary.ts actually has,
// in ascending complexity order, so it degrades gracefully while only a
// handful of real scenes exist.
export const SCENE_COUNT_AFTER_TUTORIAL = 6;
export const DIFFERENCE_COUNT_PROGRESSION = [4, 5, 6, 7, 8, 9] as const;

export type AgeDifficultyConfig = {
  // Tap-tolerance floor (percentage of the copy image's shorter edge) —
  // never shrink an authored hotspot below this, so younger kids always
  // get a forgiving target regardless of how tight a scene's own data is.
  minTargetRadiusPct: number;
  // How long a scene must be active before the hint button unlocks.
  hintAvailableAfterMs: number;
  zoomEnabled: boolean;
};

export const AGE_BAND_CONFIG: Record<AgeBand, AgeDifficultyConfig> = {
  "6-10": {
    minTargetRadiusPct: 6,
    hintAvailableAfterMs: 15000,
    zoomEnabled: true,
  },
  "11-16": {
    minTargetRadiusPct: 4,
    hintAvailableAfterMs: 30000,
    zoomEnabled: false,
  },
};

// Hints are a limited resource per scene, not unlimited — once used up,
// the child goes back to scanning on their own.
export const MAX_HINTS_PER_SCENE = 4;

// How long an incorrect-tap ripple lingers before clearing, and how long
// the "repaired" cross-fade holds before advancing to the next scene.
export const INCORRECT_RIPPLE_MS = 500;
export const SCENE_REPAIR_HOLD_MS = 1400;

// Fumi's one-time region-intro line — written as playing alongside the
// child ("let's"), not instructing them, and doubles as the only "how to
// play" the game gets (no separate tutorial round — see sceneLibrary.ts).
export const NARRATION_TEXT = "The Mist's copy below looks perfect... but it isn't. Let's find what's wrong!";

export const DEFAULT_QUEST: QuestContext = {
  region: "Greenwood",
  city: "Fernhaven",
  questId: "the-mirror-grove-trial",
  part: "A",
};

// Progression/reward constants, straight from the spec row — surfaced on
// the complete screen; actual ledger/wallet integration is a backend
// concern outside this game's scope (see lib/sessionReporter.ts).
export const XP_REWARD = 80;
export const COIN_REWARD_BASE = 20;
export const COIN_REWARD_FIST_BONUS = 10;
export const GEM_REWARD = 10;
