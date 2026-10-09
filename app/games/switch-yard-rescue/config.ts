import type { GemType, QuestContext } from "./types";

// Fixed mobile-first design surface — matches every other game's PhoneFrame.
export const PLAY_AREA = { width: 390, height: 700 };
export const SAFE_AREA_TOP = 44;

// Straight from the spec spreadsheet (column F).
export const NARRATION_TEXT =
  "Read the clues to load the energy gems into the carts in the right order. The power station will only restart if the carts enter in the correct order.";
export const SEND_CARTS_LABEL = "Send Carts";

// Carved-gem palette — one accent color per gem type, used for the card
// glow/border and the cart-slot fill once loaded. Not derived from the
// shared --color tokens since each gem needs its own hue.
export const GEM_THEME: Record<GemType, { label: string; color: string; glow: string }> = {
  moss: { label: "Moss", color: "#5FBE63", glow: "rgba(95,190,99,0.55)" },
  river: { label: "River", color: "#4FA8E8", glow: "rgba(79,168,232,0.55)" },
  sunstone: { label: "Sunstone", color: "#F0A63C", glow: "rgba(240,166,60,0.55)" },
  amethyst: { label: "Amethyst", color: "#B07CFF", glow: "rgba(176,124,255,0.55)" },
  echo: { label: "Echo", color: "#3DD6D0", glow: "rgba(61,214,208,0.55)" },
  ember: { label: "Ember", color: "#FF7A4D", glow: "rgba(255,122,77,0.55)" },
};

// How long the "wrong order" shake holds before the cart slots reset for
// another attempt, and how long the success glow holds before advancing.
export const RETRY_SHAKE_MS = 480;
export const ROUND_SUCCESS_HOLD_MS = 1400;

export const DEFAULT_QUEST: QuestContext = {
  region: "Greenwood",
  city: "Fernhaven",
  questId: "switch-yard-rescue",
  part: "A",
};
