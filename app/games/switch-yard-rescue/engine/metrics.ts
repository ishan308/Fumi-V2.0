import type { GameOutcome, RoundResult } from "../types";

// Forgiving rating, same spirit as every other FUMI mini-game: the worst
// finishable outcome is still 1 star, never 0.
function starsForRun(perfectRounds: number, roundsCompleted: number): number {
  if (roundsCompleted === 0) return 1;
  const perfectRate = perfectRounds / roundsCompleted;
  if (perfectRate >= 0.8) return 3;
  if (perfectRate >= 0.5) return 2;
  return 1;
}

export function computeGameOutcome(roundResults: RoundResult[], totalRoundsPresented: number, startedAt: number, endedAt: number): GameOutcome {
  const roundsCompleted = roundResults.length;
  const completionRatePct = totalRoundsPresented > 0 ? (roundsCompleted / totalRoundsPresented) * 100 : 0;
  const perfectRounds = roundResults.filter((r) => r.solvedFirstTry).length;
  const totalAttempts = roundResults.reduce((sum, r) => sum + r.attempts, 0);
  const avgAttemptsPerRound = roundsCompleted > 0 ? totalAttempts / roundsCompleted : 0;

  return {
    roundResults,
    totalRoundsPresented,
    roundsCompleted,
    completionRatePct,
    perfectRounds,
    totalAttempts,
    avgAttemptsPerRound,
    gameplayDurationMs: endedAt - startedAt,
    starsEarned: starsForRun(perfectRounds, roundsCompleted),
  };
}
