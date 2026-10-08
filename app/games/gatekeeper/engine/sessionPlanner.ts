import type { AgeBand, PracticeTrialPlan, TrialKind, TrialPlan } from "../types";
import {
  AGE_BAND_CONFIG,
  GO_PER_BLOCK,
  NO_GO_PER_BLOCK,
  PRACTICE_PLAN,
  TOTAL_BLOCKS,
  TRIALS_PER_BLOCK,
  practiceTiming,
  responseWindowForTrial,
} from "../config";
import { ALL_SYMBOL_IDS } from "./symbolLibrary";
import { createRng, pickRandom, randInt, shuffle, type Rng } from "./rng";

function rampFloat(easy: number, hard: number, blockIndex: number, totalBlocks: number): number {
  const t = totalBlocks > 1 ? blockIndex / (totalBlocks - 1) : 0;
  return easy + (hard - easy) * t;
}

// 21 go / 3 no-go per block, shuffled so no-go trials never open a block
// and never land back-to-back — the standard go/no-go layout constraint
// that keeps withholding a deliberate read of the rune, not a lucky guess
// about position.
function buildBlockKinds(rng: Rng): TrialKind[] {
  const pool: TrialKind[] = [
    ...Array.from({ length: GO_PER_BLOCK }, (): TrialKind => "go"),
    ...Array.from({ length: NO_GO_PER_BLOCK }, (): TrialKind => "no-go"),
  ];

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = shuffle(pool, rng);
    const opensWithNoGo = candidate[0] === "no-go";
    const hasConsecutiveNoGo = candidate.some((kind, i) => i > 0 && kind === "no-go" && candidate[i - 1] === "no-go");
    if (!opensWithNoGo && !hasConsecutiveNoGo) return candidate;
  }

  // Deterministic fallback (never reached in practice): evenly space the
  // no-go trials so the constraint holds even if repeated shuffles didn't.
  const spaced = Array.from({ length: TRIALS_PER_BLOCK }, (): TrialKind => "go");
  const gap = Math.floor(TRIALS_PER_BLOCK / (NO_GO_PER_BLOCK + 1));
  for (let i = 0; i < NO_GO_PER_BLOCK; i++) spaced[gap * (i + 1)] = "no-go";
  return spaced;
}

export function buildRealTrials(ageBand: AgeBand, sessionSeed: string): TrialPlan[] {
  const cfg = AGE_BAND_CONFIG[ageBand];
  const trials: TrialPlan[] = [];

  for (let blockIndex = 0; blockIndex < TOTAL_BLOCKS; blockIndex++) {
    const rng = createRng(`${sessionSeed}-gk-block${blockIndex}`);
    const kinds = buildBlockKinds(rng);
    const crackStrength = rampFloat(cfg.crackStrengthRange[0], cfg.crackStrengthRange[1], blockIndex, TOTAL_BLOCKS);

    kinds.forEach((kind) => {
      const trialIndex = trials.length;
      trials.push({
        trialIndex,
        blockIndex,
        kind,
        symbolId: pickRandom(ALL_SYMBOL_IDS, rng),
        crackStrength,
        displayMs: cfg.displayMs,
        // Exact trial-number schedule (see config.ts), not a per-block
        // ramp — applies to Go and No-Go runes alike.
        responseWindowMs: responseWindowForTrial(trialIndex),
      });
    });
  }

  return trials;
}

export function buildPracticeTrials(ageBand: AgeBand): PracticeTrialPlan[] {
  return PRACTICE_PLAN.map((base) => ({ ...base, ...practiceTiming(ageBand, base.kind) }));
}

export function itiForBlock(ageBand: AgeBand, blockIndex: number, rng: Rng): number {
  const cfg = AGE_BAND_CONFIG[ageBand];
  const [easy, hard] = cfg.itiRange;
  const target = rampFloat(easy, hard, blockIndex, TOTAL_BLOCKS);
  const jitter = randInt(rng, 41) - 20; // +/-20ms jitter around the ramped target
  return Math.max(150, Math.round(target + jitter));
}
