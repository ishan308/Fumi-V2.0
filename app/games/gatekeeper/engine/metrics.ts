import type { GameOutcome, TrialResult } from "../types";

// Forgiving rating, same spirit as every other FUMI mini-game: the worst
// outcome is still 1 star, never 0, so the game always feels finishable.
function starsForRun(cleanAccuracyPct: number, corruptedTapped: number): number {
  if (cleanAccuracyPct >= 90 && corruptedTapped <= 1) return 3;
  if (cleanAccuracyPct >= 75 && corruptedTapped <= 3) return 2;
  return 1;
}

export function computeGameOutcome(trialResults: TrialResult[], startedAt: number, endedAt: number): GameOutcome {
  const cleanTrials = trialResults.filter((t) => t.kind === "go");
  const correctCleanTapped = cleanTrials.filter((t) => t.outcome === "correct-go").length;
  const cleanMissed = cleanTrials.filter((t) => t.outcome === "omission").length;
  const corruptedTapped = trialResults.filter((t) => t.outcome === "commission").length;

  const totalCleanPresented = cleanTrials.length;
  const cleanAccuracyPct = totalCleanPresented > 0 ? (correctCleanTapped / totalCleanPresented) * 100 : 0;

  const reactionTimes = trialResults.map((t) => t.reactionTimeMs).filter((ms): ms is number => ms !== null);
  const avgResponseTimeMs = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((sum, ms) => sum + ms, 0) / reactionTimes.length) : null;

  return {
    trialResults,
    totalCleanPresented,
    correctCleanTapped,
    cleanAccuracyPct,
    corruptedTapped,
    cleanMissed,
    avgResponseTimeMs,
    gameplayDurationMs: endedAt - startedAt,
    starsEarned: starsForRun(cleanAccuracyPct, corruptedTapped),
  };
}
