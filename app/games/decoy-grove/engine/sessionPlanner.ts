import type { ScenePlan } from "../types";
import { SCENE_LIBRARY } from "./sceneLibrary";

// Splits the authored library into an optional tutorial scene (flagged
// isTutorial, unscored) plus the scored session in ascending complexity
// order — "6 scored scenes after tutorial" per spec, but this plays
// whatever sceneLibrary.ts actually has, so it degrades gracefully while
// only a handful of real scenes exist instead of crashing or padding with
// fakes.
export function buildSceneSession(): { tutorialScene: ScenePlan | null; scoredScenes: ScenePlan[] } {
  const sorted = [...SCENE_LIBRARY].sort((a, b) => a.complexity - b.complexity);
  const tutorialScene = sorted.find((s) => s.isTutorial) ?? null;
  const scoredScenes = sorted.filter((s) => s !== tutorialScene);
  return { tutorialScene, scoredScenes };
}
