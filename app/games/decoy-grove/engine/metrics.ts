import type { ComplexityAccuracy, DifferenceType, DifferenceTypeAccuracy, GameOutcome, SceneResult } from "../types";

// Forgiving rating, same spirit as every other FUMI mini-game: the worst
// finishable outcome is still 1 star, never 0.
function starsForRun(detectionAccuracyPct: number, incorrectAreaTaps: number, scenesCompleted: number): number {
  if (scenesCompleted === 0) return 1;
  if (detectionAccuracyPct >= 90 && incorrectAreaTaps <= 3) return 3;
  if (detectionAccuracyPct >= 70 && incorrectAreaTaps <= 8) return 2;
  return 1;
}

export function computeGameOutcome(sceneResults: SceneResult[], totalScenesPresented: number, startedAt: number, endedAt: number): GameOutcome {
  const scenesCompleted = sceneResults.length;
  const completionRatePct = totalScenesPresented > 0 ? (scenesCompleted / totalScenesPresented) * 100 : 0;

  const totalDifferencesPresented = sceneResults.reduce((sum, s) => sum + s.totalDifferences, 0);
  const totalDifferencesFound = sceneResults.reduce((sum, s) => sum + s.differencesFound, 0);
  const differencesMissed = totalDifferencesPresented - totalDifferencesFound;
  const detectionAccuracyPct = totalDifferencesPresented > 0 ? (totalDifferencesFound / totalDifferencesPresented) * 100 : 0;

  const correctTaps = sceneResults.reduce((sum, s) => sum + s.correctTaps, 0);
  const incorrectAreaTaps = sceneResults.reduce((sum, s) => sum + s.incorrectTaps, 0);
  const totalTapsMade = correctTaps + incorrectAreaTaps;

  const byType = new Map<DifferenceType, { total: number; found: number }>();
  for (const scene of sceneResults) {
    for (const [type, counts] of Object.entries(scene.byType) as [DifferenceType, { total: number; found: number }][]) {
      const existing = byType.get(type) ?? { total: 0, found: 0 };
      byType.set(type, { total: existing.total + counts.total, found: existing.found + counts.found });
    }
  }
  const accuracyByType: DifferenceTypeAccuracy[] = Array.from(byType.entries()).map(([type, { total, found }]) => ({
    type,
    total,
    found,
    pct: total > 0 ? (found / total) * 100 : 0,
  }));

  const byComplexity = new Map<number, { total: number; found: number }>();
  for (const scene of sceneResults) {
    const existing = byComplexity.get(scene.complexity) ?? { total: 0, found: 0 };
    byComplexity.set(scene.complexity, {
      total: existing.total + scene.totalDifferences,
      found: existing.found + scene.differencesFound,
    });
  }
  const accuracyByComplexity: ComplexityAccuracy[] = Array.from(byComplexity.entries())
    .sort(([a], [b]) => a - b)
    .map(([complexity, { total, found }]) => ({
      complexity,
      total,
      found,
      pct: total > 0 ? (found / total) * 100 : 0,
    }));

  return {
    sceneResults,
    totalScenesPresented,
    scenesCompleted,
    completionRatePct,
    totalDifferencesPresented,
    totalDifferencesFound,
    differencesMissed,
    detectionAccuracyPct,
    totalTapsMade,
    correctTaps,
    incorrectAreaTaps,
    accuracyByType,
    accuracyByComplexity,
    gameplayDurationMs: endedAt - startedAt,
    starsEarned: starsForRun(detectionAccuracyPct, incorrectAreaTaps, scenesCompleted),
  };
}
