import type { RoundPlan } from "../types";
import { ROUND_LIBRARY } from "./roundLibrary";

// No shuffling needed — unlike Switch Yard Rescue's palette, there's no
// per-round randomness to seed here (counts always start at 0 and the
// player builds them up via the +/- steppers), so rounds just play in
// their authored order.
export function buildRoundSession(): RoundPlan[] {
  return [...ROUND_LIBRARY].sort((a, b) => a.roundNumber - b.roundNumber);
}
