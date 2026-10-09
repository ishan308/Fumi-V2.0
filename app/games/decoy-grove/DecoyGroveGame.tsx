"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { AgeBand, DifferenceType, GameOutcome, ScenePlan, SceneResult } from "./types";
import { AGE_BAND_CONFIG, MAX_HINTS_PER_SCENE, NARRATION_TEXT, PLAY_AREA, SAFE_AREA_TOP, SCENE_REPAIR_HOLD_MS } from "./config";
import { buildSceneSession } from "./engine/sessionPlanner";
import { computeGameOutcome } from "./engine/metrics";
import { SceneDuo } from "./components/SceneDuo";
import { Typewriter } from "../../components/Typewriter";
import { Ambient } from "../../components/Ambient";
import { FumiCompanion } from "../../components/FumiCompanion";
import { FumiPortrait } from "../../components/FumiPortrait";
import { reportGame } from "./lib/sessionReporter";

// One continuous game: region-intro (narration) -> playing (tutorial scene,
// if the library has one, then every scored scene back-to-back) ->
// complete. Same shape as every other FUMI mini-game.
type GameScreen = "region-intro" | "playing" | "complete";

export type DecoyGroveGameProps = {
  ageBand: AgeBand;
  // Accepted for shape-parity with every other game's props, and for a
  // future seeded scene-order/selection — buildSceneSession() has no
  // randomness yet (there's only ever one authored library order), so
  // nothing reads this yet.
  seed?: string;
  onExit: () => void;
};

const sceneWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: PLAY_AREA.width,
  height: PLAY_AREA.height,
  overflow: "hidden",
  background: "var(--color-midnight)",
  fontFamily: "var(--font-body), system-ui",
};

const veilStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 200,
  background: "var(--color-midnight)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "opacity 380ms ease",
};

const veilMessageStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 20,
  fontWeight: 800,
  color: "var(--color-soft)",
  animation: "bubble-pop 260ms var(--ease-pop) both",
};

export function DecoyGroveGame({ ageBand, onExit }: DecoyGroveGameProps) {
  const [screen, setScreen] = useState<GameScreen>("region-intro");
  const [narrationDone, setNarrationDone] = useState(false);

  const { tutorialScene, scoredScenes } = useMemo(() => buildSceneSession(), []);
  const sceneQueue = useMemo(() => (tutorialScene ? [tutorialScene, ...scoredScenes] : scoredScenes), [tutorialScene, scoredScenes]);

  const [sceneIndex, setSceneIndex] = useState(0);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [repairing, setRepairing] = useState(false);
  const [hintUnlocked, setHintUnlocked] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<GameOutcome | null>(null);
  const [veil, setVeil] = useState<{ opacity: number; message: string | null }>({ opacity: 0, message: null });

  const startedAtRef = useRef<number>(0);
  const sceneStartedAtRef = useRef<number>(0);
  const resultsRef = useRef<SceneResult[]>([]);
  const correctTapsRef = useRef(0);
  const incorrectTapsRef = useRef(0);
  const hintsUsedRef = useRef(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentScene: ScenePlan | undefined = sceneQueue[sceneIndex];
  const ageConfig = AGE_BAND_CONFIG[ageBand];

  const runTransition = useCallback((action: () => void, message: string | null = null) => {
    setVeil({ opacity: 1, message });
    const holdMs = message ? 550 : 120;
    setTimeout(() => {
      action();
      setTimeout(() => setVeil({ opacity: 0, message: null }), holdMs);
    }, 380);
  }, []);

  const resetSceneRefs = useCallback(() => {
    correctTapsRef.current = 0;
    incorrectTapsRef.current = 0;
    hintsUsedRef.current = 0;
    sceneStartedAtRef.current = Date.now();
    setFoundIds(new Set());
    setRepairing(false);
    setHintUnlocked(false);
    setHintText(null);
    setHintsUsedCount(0);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintUnlocked(true), ageConfig.hintAvailableAfterMs);
  }, [ageConfig.hintAvailableAfterMs]);

  const handleStartAdventure = useCallback(() => {
    startedAtRef.current = Date.now();
    setSceneIndex(0);
    resetSceneRefs();
    runTransition(() => setScreen("playing"));
  }, [resetSceneRefs, runTransition]);

  const finishGame = useCallback(() => {
    const endedAt = Date.now();
    const outcome = computeGameOutcome(resultsRef.current, scoredScenes.length, startedAtRef.current, endedAt);
    reportGame(outcome);
    setLastOutcome(outcome);
    runTransition(() => setScreen("complete"));
  }, [runTransition, scoredScenes.length]);

  const advanceScene = useCallback(() => {
    const nextIndex = sceneIndex + 1;
    if (nextIndex >= sceneQueue.length) {
      finishGame();
    } else {
      setSceneIndex(nextIndex);
      resetSceneRefs();
    }
  }, [sceneIndex, sceneQueue.length, finishGame, resetSceneRefs]);

  const handleDifferenceFound = useCallback(
    (differenceId: string) => {
      // Deliberately NOT the setFoundIds(prev => ...) functional-update
      // form — this handler schedules real side effects (pushing a scene
      // result, starting the advance timer), and React StrictMode's dev
      // double-invoke of updater functions would fire those twice. Reading
      // `foundIds` from the closure (it's a dependency below) and calling
      // setFoundIds with a plain value keeps this a single, ordinary event
      // handler instead.
      if (!currentScene || foundIds.has(differenceId)) return;
      correctTapsRef.current += 1;
      const next = new Set(foundIds);
      next.add(differenceId);
      setFoundIds(next);

      if (next.size >= currentScene.differences.length) {
        setRepairing(true);

        if (!currentScene.isTutorial) {
          const byType: Partial<Record<DifferenceType, { total: number; found: number }>> = {};
          for (const d of currentScene.differences) {
            const entry = byType[d.type] ?? { total: 0, found: 0 };
            entry.total += 1;
            entry.found += 1; // every difference is found by scene end — see types.ts's SceneResult note
            byType[d.type] = entry;
          }
          resultsRef.current = [
            ...resultsRef.current,
            {
              sceneId: currentScene.id,
              complexity: currentScene.complexity,
              totalDifferences: currentScene.differences.length,
              differencesFound: next.size,
              correctTaps: correctTapsRef.current,
              incorrectTaps: incorrectTapsRef.current,
              hintsUsed: hintsUsedRef.current,
              byType,
              durationMs: Date.now() - sceneStartedAtRef.current,
            },
          ];
        }

        setTimeout(advanceScene, SCENE_REPAIR_HOLD_MS);
      }
    },
    [currentScene, foundIds, advanceScene]
  );

  const handleIncorrectTap = useCallback(() => {
    incorrectTapsRef.current += 1;
  }, []);

  const handleHintRequest = useCallback(() => {
    if (!currentScene || !hintUnlocked || hintsUsedRef.current >= MAX_HINTS_PER_SCENE) return;
    const nextUnfound = currentScene.differences.find((d) => !foundIds.has(d.id));
    if (!nextUnfound) return;
    hintsUsedRef.current += 1;
    setHintsUsedCount(hintsUsedRef.current);
    setHintText(nextUnfound.hint);
    setTimeout(() => setHintText(null), 4000);
  }, [currentScene, hintUnlocked, foundIds]);

  const handlePlayAgain = useCallback(() => {
    setNarrationDone(false);
    runTransition(() => setScreen("region-intro"));
  }, [runTransition]);

  const remaining = currentScene ? currentScene.differences.length - foundIds.size : 0;

  let screenContent: React.ReactNode = null;

  if (screen === "region-intro") {
    screenContent = <RegionIntro narrationDone={narrationDone} onNarrationDone={() => setNarrationDone(true)} onStart={handleStartAdventure} />;
  } else if (screen === "playing" && currentScene) {
    // The two panels fill nearly the whole screen, zero scroll, each
    // framed as its own card (rounded corners, border, a real gap between
    // them — see SceneDuo's GAP) so they read as "two separate photos",
    // with a slight side/top/bottom margin that backs the crop off a
    // little ("zoom out") compared to true edge-to-edge. The header floats
    // on top as a semi-transparent overlay instead of reserving its own
    // band. Getting both "no scroll" and "nearly full width" for a scene
    // whose source aspect ratio doesn't evenly divide the screen still
    // requires some cropping — see sceneLibrary.ts's note on scene-1 for
    // exactly what that cost in authored differences, and SceneDuo's
    // coverCropTransform for how taps and found-markers stay accurate
    // against the cropped image.
    const sidePadding = 14;
    const verticalMargin = 10;
    const panelGap = 14; // keep in sync with SceneDuo's GAP constant
    const panelWidth = PLAY_AREA.width - sidePadding * 2;
    const panelHeight = (PLAY_AREA.height - verticalMargin * 2 - panelGap) / 2;

    screenContent = (
      <>
        <Ambient tint="forest" />
        <div style={{ ...playingHeaderStyle, top: SAFE_AREA_TOP + 6 }}>
          <button type="button" className="tap-scale" onClick={onExit} style={exitButtonStyle} aria-label="Exit game">
            ✕
          </button>
          <div style={differenceCounterStyle}>
            {remaining} difference{remaining === 1 ? "" : "s"} left
          </div>
          {hintUnlocked && hintsUsedCount < MAX_HINTS_PER_SCENE ? (
            <button type="button" className="tap-scale" onClick={handleHintRequest} style={hintButtonStyle}>
              ✨ Hint ({MAX_HINTS_PER_SCENE - hintsUsedCount})
            </button>
          ) : (
            <div style={{ width: 40 }} aria-hidden />
          )}
        </div>

        <div style={{ paddingTop: verticalMargin }}>
          <SceneDuo
            scene={currentScene}
            foundIds={foundIds}
            minTargetRadiusPct={ageConfig.minTargetRadiusPct}
            interactive={!repairing}
            repairing={repairing}
            onDifferenceFound={handleDifferenceFound}
            onIncorrectTap={handleIncorrectTap}
            width={panelWidth}
            height={panelHeight}
          />
        </div>

        {hintText && (
          <div key={hintText} style={hintToastStyle}>
            {hintText}
          </div>
        )}
      </>
    );
  } else if (screen === "complete" && lastOutcome) {
    screenContent = <GameComplete outcome={lastOutcome} onPlayAgain={handlePlayAgain} onFinish={onExit} />;
  }

  return (
    <div style={sceneWrapperStyle}>
      {screenContent}
      <div style={{ ...veilStyle, opacity: veil.opacity, pointerEvents: veil.opacity > 0 ? "auto" : "none" }}>
        {veil.message && (
          <div key={veil.message} style={veilMessageStyle}>
            {veil.message}
          </div>
        )}
      </div>
    </div>
  );
}

type RegionIntroProps = {
  narrationDone: boolean;
  onNarrationDone: () => void;
  onStart: () => void;
};

function RegionIntro({ narrationDone, onNarrationDone, onStart }: RegionIntroProps) {
  return (
    <>
      <Ambient tint="forest" />

      <div style={gameTitleWrapStyle}>
        <div aria-hidden style={titleOrnamentStyle}>
          <span style={titleOrnamentLineStyle} />
          <span style={{ fontSize: 11 }}>✦</span>
          <span style={titleOrnamentLineStyle} />
        </div>
        <div style={titleHighlightStyle}>
          <div style={gameTitleStyle}>Decoy Grove</div>
        </div>
      </div>

      <div style={narrationGroupStyle}>
        <div style={narrationBubbleStyle}>
          <Typewriter text={NARRATION_TEXT} onDone={onNarrationDone} speedMultiplier={0.9} />
          <div style={narrationBubbleTailStyle} />
        </div>
        <FumiPortrait />
      </div>

      <button
        type="button"
        className="tap-scale"
        onClick={onStart}
        disabled={!narrationDone}
        style={{ ...continueButtonStyle, opacity: narrationDone ? 1 : 0, pointerEvents: narrationDone ? "auto" : "none" }}
      >
        Start the Adventure →
      </button>
    </>
  );
}

type GameCompleteProps = {
  outcome: GameOutcome;
  onPlayAgain: () => void;
  onFinish: () => void;
};

function GameComplete({ outcome, onPlayAgain, onFinish }: GameCompleteProps) {
  const seconds = Math.round(outcome.gameplayDurationMs / 1000);
  const timeLabel = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div style={missionCompleteStyle}>
      <Ambient tint="forest" />
      <FumiCompanion mood="happy" size={96} tailWag />
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-soft)" }}>Mirror Grove Restored!</div>

      <div style={{ display: "flex", gap: 6 }} aria-label={`${outcome.starsEarned} of 3 stars`}>
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            style={{ fontSize: 30, opacity: s <= outcome.starsEarned ? 1 : 0.25, animation: `star-pop 420ms ease-out ${s * 0.12}s both` }}
          >
            ⭐
          </span>
        ))}
      </div>

      <div style={statsCardStyle}>
        <SummaryStat label="Scenes Completed" value={`${outcome.scenesCompleted}/${outcome.totalScenesPresented}`} />
        <SummaryStat label="Detection Accuracy" value={`${Math.round(outcome.detectionAccuracyPct)}%`} />
        <SummaryStat label="Differences Found" value={`${outcome.totalDifferencesFound}/${outcome.totalDifferencesPresented}`} />
        <SummaryStat label="Correct Taps" value={`${outcome.correctTaps}`} />
        <SummaryStat label="Off-target Taps" value={`${outcome.incorrectAreaTaps}`} />
        <SummaryStat label="Duration" value={timeLabel} />
      </div>

      <div style={{ display: "flex", gap: 10, width: "100%" }}>
        <button type="button" className="tap-scale" onClick={onPlayAgain} style={{ ...secondaryButtonStyle, flex: 1 }}>
          Play Again
        </button>
        <button type="button" className="tap-scale" onClick={onFinish} style={{ ...continueButtonStyle, flex: 1 }}>
          Finish
        </button>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-soft)" }}>{value}</div>
      <div style={{ fontSize: 9.5, color: "var(--color-lavender)", opacity: 0.8, textAlign: "center" }}>{label}</div>
    </div>
  );
}

const gameTitleWrapStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE_AREA_TOP + 14,
  left: 24,
  right: 24,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
};

// Same plate/wordmark treatment as every other game's region-intro — one
// shared visual identity across games, not a per-game reskin.
const titleHighlightStyle: React.CSSProperties = {
  background: "rgba(8,5,18,0.78)",
  border: "1px solid rgba(240,166,60,0.4)",
  borderRadius: 14,
  padding: "6px 24px",
  boxShadow: "0 10px 26px rgba(0,0,0,0.55)",
};

const titleOrnamentStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#F0C572",
  filter: "drop-shadow(0 0 6px rgba(240,166,60,0.6))",
};

const titleOrnamentLineStyle: React.CSSProperties = {
  width: 28,
  height: 1,
  background: "linear-gradient(90deg, transparent, #F0C572, transparent)",
};

const gameTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-title), cursive",
  fontSize: 42,
  fontWeight: 700,
  letterSpacing: 0.5,
  backgroundImage: "linear-gradient(180deg, #E8CE94 0%, #D9A94F 35%, #B87D2A 60%, #7A4F14 100%)",
  backgroundSize: "100% 200%",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  textShadow: "0 3px 8px rgba(0,0,0,0.6)",
  filter: "drop-shadow(0 0 18px rgba(240,166,60,0.5))",
  animation: "gold-shimmer 4s ease-in-out infinite",
};

const narrationGroupStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 210,
  left: 24,
  right: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  alignItems: "center",
  animation: "bubble-pop 420ms var(--ease-pop) both",
};

const narrationBubbleStyle: React.CSSProperties = {
  position: "relative",
  background: "rgba(246,245,255,0.96)",
  color: "var(--color-ink)",
  borderRadius: 18,
  padding: "14px 16px",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.5,
  textAlign: "center",
  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
};

const narrationBubbleTailStyle: React.CSSProperties = {
  position: "absolute",
  bottom: -8,
  left: "50%",
  marginLeft: -8,
  width: 16,
  height: 16,
  background: "rgba(246,245,255,0.96)",
  transform: "rotate(45deg)",
};

// Same gradient-cta token as every other game — shared visual identity, not
// a per-game reskin.
const continueButtonStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 40,
  left: 24,
  right: 24,
  minHeight: 54,
  border: "none",
  borderRadius: 999,
  background: "var(--gradient-cta)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15.5,
  cursor: "pointer",
  boxShadow: "var(--shadow-cta)",
  transition: "opacity 300ms ease",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 50,
  border: "1.5px solid rgba(196,181,253,0.5)",
  borderRadius: 999,
  background: "transparent",
  color: "var(--color-lavender)",
  fontWeight: 800,
  fontSize: 14.5,
  cursor: "pointer",
};

// Slim overlay header (not a reserved layout band) — the goal is to give
// the two scene panels as much vertical room as possible now that Fumi and
// the instructional bubble are gone from this screen entirely.
const playingHeaderStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 14px",
  zIndex: 25,
};

const exitButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "1px solid rgba(240,166,60,0.35)",
  background: "rgba(10,8,20,0.78)",
  color: "var(--color-soft)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const differenceCounterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 14px",
  borderRadius: 999,
  background: "rgba(10,8,20,0.8)",
  border: "1px solid rgba(240,166,60,0.4)",
  color: "var(--color-gold)",
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const hintButtonStyle: React.CSSProperties = {
  height: 34,
  padding: "0 14px",
  border: "1px solid rgba(240,166,60,0.5)",
  borderRadius: 999,
  background: "rgba(10,8,20,0.85)",
  color: "var(--color-gold)",
  fontWeight: 800,
  fontSize: 12.5,
  cursor: "pointer",
  flexShrink: 0,
  whiteSpace: "nowrap",
};

// A brief, standalone hint toast — no Fumi, no persistent dialogue bubble,
// just the clue text itself, fading in/out over the scene panels.
const hintToastStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 18,
  left: 24,
  right: 24,
  padding: "10px 16px",
  borderRadius: 14,
  background: "rgba(10,8,20,0.9)",
  border: "1px solid rgba(240,166,60,0.45)",
  color: "var(--color-soft)",
  fontSize: 12.5,
  fontWeight: 600,
  lineHeight: 1.4,
  textAlign: "center",
  zIndex: 26,
  animation: "hint-toast-in 280ms var(--ease-pop) both, hint-toast-out 280ms ease-in 3700ms forwards",
};

const missionCompleteStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, var(--color-deep-purple) 0%, var(--color-midnight) 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  gap: 16,
  color: "var(--color-soft)",
  fontFamily: "var(--font-body), system-ui",
};

const statsCardStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(196,181,253,0.25)",
  borderRadius: 20,
  padding: 16,
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
};
