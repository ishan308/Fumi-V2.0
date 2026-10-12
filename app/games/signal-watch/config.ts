import type { QuestContext, SignalType } from "./types";

// Fixed mobile-first design surface — matches every other game's PhoneFrame.
export const PLAY_AREA = { width: 390, height: 700 };
export const SAFE_AREA_TOP = 44;

// Straight from the spec spreadsheet (column H).
export const NARRATION_TEXT = "Keep adding the energy signals till you reach the target. Restore the river's energy to get it flowing again.";
export const SEND_ENERGY_LABEL = "Send Energy";

// Carved-banner palette — one accent color per signal type, used for the
// counter's banner/waterfall glow. Leaf/Wave/Sun map to the same
// green/blue/gold family the rest of the app already uses for its three-
// way accent split (e.g. Switch Yard Rescue's Moss/River/Sunstone gems).
export const SIGNAL_THEME: Record<SignalType, { label: string; color: string; glow: string }> = {
  leaf: { label: "Leaf", color: "#5FBE63", glow: "rgba(95,190,99,0.55)" },
  wave: { label: "Wave", color: "#4FA8E8", glow: "rgba(79,168,232,0.55)" },
  sun: { label: "Sun", color: "#F0A63C", glow: "rgba(240,166,60,0.55)" },
};

// A generous cap on the +/- stepper, not a gameplay constraint — every
// authored round's solutions use small counts (1-4 per signal), this just
// keeps a mis-tapping player from scrolling a counter into the hundreds.
export const MAX_COUNT_PER_SIGNAL = 20;

// How long the "wrong total" shake holds before the counters become
// adjustable again, and how long the success glow holds before advancing.
export const RETRY_SHAKE_MS = 480;
export const ROUND_SUCCESS_HOLD_MS = 1400;

export const DEFAULT_QUEST: QuestContext = {
  region: "Greenwood",
  city: "Fernhaven",
  questId: "signal-watch",
  part: "A",
};
