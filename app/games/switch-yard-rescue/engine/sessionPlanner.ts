import type { GemType, RoundPlan } from "../types";
import { ROUND_LIBRARY } from "./roundLibrary";
import { createRng, shuffle } from "./rng";

export function buildRoundSession(): RoundPlan[] {
  return [...ROUND_LIBRARY].sort((a, b) => a.roundNumber - b.roundNumber);
}

// The palette must not just mirror correctOrder — that would make the
// puzzle visually trivial (just copy left-to-right). Shuffled
// deterministically per session+round so a replay with the same seed
// reshuffles the same way.
export function shufflePalette(round: RoundPlan, sessionSeed: string): GemType[] {
  const rng = createRng(`${sessionSeed}-round${round.roundNumber}`);
  return shuffle(round.cards, rng);
}
