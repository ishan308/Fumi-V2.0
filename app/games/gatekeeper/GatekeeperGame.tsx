"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgeBand, GameOutcome, PracticeTrialPlan, SymbolId, TrialOutcome, TrialPlan, TrialResult } from "./types";
import {
  CHILD_RULE_TEXT,
  CONSECUTIVE_ERROR_REMINDER_THRESHOLD,
  GATE_CIRCLE,
  GATE_POWER_CORRECT_THRESHOLDS,
  NARRATION_TEXT,
  PLAY_AREA,
  SAFE_AREA_TOP,
  TOTAL_BLOCKS,
} from "./config";
import { buildPracticeTrials, buildRealTrials, itiForBlock } from "./engine/sessionPlanner";
import { computeGameOutcome } from "./engine/metrics";
import { createRng } from "./engine/rng";
import { GateRune, type RuneOutcome } from "./components/GateRune";
import { GatePowerMeter } from "./components/GatePowerMeter";
import { GateBackdrop } from "./components/GateBackdrop";
import { ScreenCrack } from "./components/ScreenCrack";
import { Typewriter } from "../../components/Typewriter";
import { Ambient } from "../../components/Ambient";
import { Fumi } from "../../components/Fumi";
import { FumiCompanion } from "../../components/FumiCompanion";
import { FumiPortrait } from "../../components/FumiPortrait";
import { reportGame } from "./lib/sessionReporter";

// One continuous game: region-intro (narration) -> tutorial, i.e. "How to
// Play" (8 practice trials) -> playing (96 scored trials across 4 blocks)
// -> complete.
type GameScreen = "region-intro" | "tutorial" | "playing" | "complete";

function generateSeed(): string {
  return `gk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type GatekeeperGameProps = {
  ageBand: AgeBand;
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

export function GatekeeperGame({ ageBand, seed, onExit }: GatekeeperGameProps) {
  const [sessionSeed] = useState(() => seed ?? generateSeed());
  const [attempt, setAttempt] = useState(0);

  const [screen, setScreen] = useState<GameScreen>("region-intro");
  const [narrationDone, setNarrationDone] = useState(false);

  const [practiceIndex, setPracticeIndex] = useState(0);
  // 0 = first attempt at this practice trial, 1 = its one allowed replay
  // (after a corrective callout) — bumping this remounts PracticeRunner
  // via its key even though practiceIndex itself hasn't changed.
  const [practiceAttempt, setPracticeAttempt] = useState(0);
  const [practiceShowingCorrection, setPracticeShowingCorrection] = useState(false);

  const [trialIndex, setTrialIndex] = useState(0);
  // Gate power stage (0..4) — driven by cumulative CORRECT Go-taps against
  // GATE_POWER_CORRECT_THRESHOLDS, not by how many trials have gone by.
  const [gateStage, setGateStage] = useState(0);
  const [powerPulseKey, setPowerPulseKey] = useState(0);
  const [milestoneStage, setMilestoneStage] = useState<number | null>(null);

  const [lastOutcome, setLastOutcome] = useState<GameOutcome | null>(null);
  const [showRuleReminder, setShowRuleReminder] = useState(false);
  // Bumped on every commission error — keys a one-shot full-screen red
  // vignette + shake so tapping a corrupted rune reads as a real mistake,
  // not just a locally-colored circle.
  const [errorPulseKey, setErrorPulseKey] = useState(0);

  const [veil, setVeil] = useState<{ opacity: number; message: string | null }>({ opacity: 0, message: null });

  const practiceTrials = useMemo(() => buildPracticeTrials(ageBand), [ageBand]);
  const realTrials = useMemo(() => buildRealTrials(ageBand, `${sessionSeed}-a${attempt}`), [ageBand, sessionSeed, attempt]);

  const startedAtRef = useRef<number>(0);
  const resultsRef = useRef<TrialResult[]>([]);
  const consecutiveWrongRef = useRef(0);
  const correctGoCountRef = useRef(0);
  const gateStageRef = useRef(0); // mirrors gateStage state, read synchronously inside handleRealResult
  const pendingMilestoneRef = useRef<number | null>(null);

  const currentPractice = practiceTrials[practiceIndex];
  const currentTrial = realTrials[trialIndex];

  // Masks a hard content swap (screen change) behind a brief fade-to-dark
  // instead of an instant cut, same pattern as every other game in the app.
  const runTransition = useCallback((action: () => void, message: string | null = null) => {
    setVeil({ opacity: 1, message });
    const holdMs = message ? 550 : 120;
    setTimeout(() => {
      action();
      setTimeout(() => setVeil({ opacity: 0, message: null }), holdMs);
    }, 380);
  }, []);

  const handleStartAdventure = useCallback(() => {
    setPracticeIndex(0);
    setPracticeAttempt(0);
    setPracticeShowingCorrection(false);
    runTransition(() => setScreen("tutorial"));
  }, [runTransition]);

  const handleTutorialDone = useCallback(() => {
    resultsRef.current = [];
    consecutiveWrongRef.current = 0;
    correctGoCountRef.current = 0;
    gateStageRef.current = 0;
    pendingMilestoneRef.current = null;
    setGateStage(0);
    setPowerPulseKey(0);
    setTrialIndex(0);
    startedAtRef.current = Date.now();
    runTransition(() => setScreen("playing"));
  }, [runTransition]);

  // Called once per practice trial's resolution. A fresh commission error
  // (tapping a corrupted rune) earns exactly one replay of the same trial
  // with Fumi pointing out the broken line, per the tutorial spec — any
  // outcome after that replay advances regardless.
  const handlePracticeTrialOutcome = useCallback(
    (commissionError: boolean) => {
      if (commissionError && practiceAttempt === 0) {
        setPracticeShowingCorrection(true);
        return;
      }
      const next = practiceIndex + 1;
      if (next >= practiceTrials.length) {
        handleTutorialDone();
      } else {
        setPracticeAttempt(0);
        setPracticeIndex(next);
      }
    },
    [practiceIndex, practiceAttempt, practiceTrials.length, handleTutorialDone]
  );

  const handleCorrectionDone = useCallback(() => {
    setPracticeShowingCorrection(false);
    setPracticeAttempt(1); // replay the same practiceIndex, once
  }, []);

  const finishGame = useCallback(() => {
    const endedAt = Date.now();
    const outcome = computeGameOutcome(resultsRef.current, startedAtRef.current, endedAt);
    reportGame(outcome);
    setLastOutcome(outcome);
    runTransition(() => setScreen("complete"));
  }, [runTransition]);

  const handleRealResult = useCallback((result: TrialResult) => {
    resultsRef.current = [...resultsRef.current, result];
    if (result.outcome === "commission") {
      setErrorPulseKey((k) => k + 1);
      consecutiveWrongRef.current += 1;
      if (consecutiveWrongRef.current >= CONSECUTIVE_ERROR_REMINDER_THRESHOLD) {
        setShowRuleReminder(true);
        consecutiveWrongRef.current = 0;
        setTimeout(() => setShowRuleReminder(false), 2600);
      }
      return;
    }

    consecutiveWrongRef.current = 0;
    if (result.outcome !== "correct-go") return;

    setPowerPulseKey((k) => k + 1);
    correctGoCountRef.current += 1;
    const newStage = GATE_POWER_CORRECT_THRESHOLDS.filter((threshold) => correctGoCountRef.current >= threshold).length;
    if (newStage > gateStageRef.current) {
      gateStageRef.current = newStage;
      setGateStage(newStage);
      pendingMilestoneRef.current = newStage;
    }
  }, []);

  const handleRealAdvance = useCallback(() => {
    const nextIndex = trialIndex + 1;
    const pendingStage = pendingMilestoneRef.current;

    if (pendingStage !== null) {
      pendingMilestoneRef.current = null;
      setMilestoneStage(pendingStage);
      setTimeout(() => {
        setMilestoneStage(null);
        if (nextIndex >= realTrials.length) finishGame();
        else setTrialIndex(nextIndex);
      }, 1400);
    } else if (nextIndex >= realTrials.length) {
      finishGame();
    } else {
      setTrialIndex(nextIndex);
    }
  }, [trialIndex, realTrials.length, finishGame]);

  const handlePlayAgain = useCallback(() => {
    setAttempt((a) => a + 1);
    setNarrationDone(false);
    setPracticeIndex(0);
    setPracticeAttempt(0);
    setPracticeShowingCorrection(false);
    runTransition(() => setScreen("region-intro"));
  }, [runTransition]);

  let screenContent: React.ReactNode = null;

  if (screen === "region-intro") {
    screenContent = <RegionIntro narrationDone={narrationDone} onNarrationDone={() => setNarrationDone(true)} onStart={handleStartAdventure} />;
  } else if (screen === "tutorial" && currentPractice) {
    screenContent = (
      <>
        <GateBackdrop powerStage={0} />
        <TutorialHeader index={practiceIndex} total={practiceTrials.length} />
        {practiceShowingCorrection ? (
          <PracticeCorrection crackStrength={currentPractice.crackStrength} symbolId={currentPractice.symbolId} onDone={handleCorrectionDone} />
        ) : (
          <PracticeRunner key={`${currentPractice.trialIndex}-${practiceAttempt}`} trial={currentPractice} onOutcome={handlePracticeTrialOutcome} />
        )}
      </>
    );
  } else if (screen === "playing" && currentTrial) {
    screenContent = (
      <>
        <GateBackdrop powerStage={gateStage} />
        <TrialRunner
          key={currentTrial.trialIndex}
          trial={currentTrial}
          ageBand={ageBand}
          sessionSeed={sessionSeed}
          onResult={handleRealResult}
          onAdvance={handleRealAdvance}
        />
        <GateHud gateStage={gateStage} powerPulseKey={powerPulseKey} onExit={onExit} />
        {showRuleReminder && <div style={ruleReminderStyle}>{CHILD_RULE_TEXT}</div>}
        {milestoneStage !== null && <BlockMilestone stage={milestoneStage} />}
        {errorPulseKey > 0 && <div key={errorPulseKey} aria-hidden style={errorVignetteStyle} />}
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
      <GateBackdrop powerStage={0} />

      <div style={gameTitleWrapStyle}>
        <div aria-hidden style={titleOrnamentStyle}>
          <span style={titleOrnamentLineStyle} />
          <span style={{ fontSize: 11 }}>✦</span>
          <span style={titleOrnamentLineStyle} />
        </div>
        <div style={titleHighlightStyle}>
          <div style={gameTitleStyle}>Gatekeeper</div>
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

function TutorialHeader({ index, total }: { index: number; total: number }) {
  return (
    <div style={tutorialHeaderStyle}>
      <div style={tutorialHeaderPlateStyle}>
        <div style={tutorialTitleStyle}>How to Play</div>
        <div style={tutorialDotsRowStyle} aria-label={`Practice ${index + 1} of ${total}`}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              style={{
                ...tutorialDotStyle,
                opacity: i < index ? 1 : i === index ? 0.95 : 0.3,
                transform: i === index ? "scale(1.35)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type PracticeRunnerProps = {
  trial: PracticeTrialPlan;
  onOutcome: (commissionError: boolean) => void;
};

function PracticeRunner({ trial, onOutcome }: PracticeRunnerProps) {
  const [phase, setPhase] = useState<"active" | "feedback">("active");
  const [runeOutcome, setRuneOutcome] = useState<RuneOutcome>(null);
  const resolvedRef = useRef(false);

  const resolve = useCallback(
    (tapped: boolean) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      const commission = trial.kind === "no-go" && tapped;
      const visual: RuneOutcome = trial.kind === "go" ? (tapped ? "go-sent" : "go-missed") : tapped ? "no-go-tapped" : "no-go-passed";
      setRuneOutcome(visual);
      setPhase("feedback");
      setTimeout(() => onOutcome(commission), commission ? 0 : 750);
    },
    [trial.kind, onOutcome]
  );

  useEffect(() => {
    // Go runes wait indefinitely for the child's tap — the child must tap
    // the clean rune to advance, not just watch it time out. Only No-Go
    // runes auto-resolve after the window, since the correct action there
    // is to do nothing.
    if (trial.kind === "go") return;
    const timer = setTimeout(() => resolve(false), trial.responseWindowMs);
    return () => clearTimeout(timer);
  }, [trial, resolve]);

  // Written as Fumi playing alongside the child, not narrating rules at
  // them — first-person-plural, in the moment ("let's", "we"), reacting to
  // what's on the gate right now rather than issuing a flat instruction.
  const instructionText =
    trial.phase === "go-forced"
      ? "A clean one — tap it with me!"
      : trial.phase === "no-go-forced"
        ? "Ooh, feel that crack? Let's leave this one be."
        : trial.kind === "go"
          ? "I spy a clean rune — your turn!"
          : "Wait... something's off about this one.";

  return (
    <>
      {trial.kind === "no-go" && <ScreenCrack crackStrength={trial.crackStrength} />}
      <div style={runeCenterStyle}>
        <GateRune kind={trial.kind} symbolId={trial.symbolId} crackStrength={trial.crackStrength} outcome={runeOutcome} interactive={phase === "active"} onTap={() => resolve(true)} />
      </div>
      <FumiCompanion variant="portrait" size={92} line={instructionText} center bottom={115} />
    </>
  );
}

function PracticeCorrection({ crackStrength, symbolId, onDone }: { crackStrength: number; symbolId: SymbolId; onDone: () => void }) {
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const t = setTimeout(dismiss, 3400);
    return () => clearTimeout(t);
  }, [dismiss]);

  return (
    <>
      <ScreenCrack crackStrength={Math.max(crackStrength, 0.9)} />
      {/* An expanding attention ring draws the eye straight to the broken
          rune, same position as live play (the artwork's own circle) so
          the crack shows up where the child will actually see it during
          real trials, not in a floating demo disconnected from the gate. */}
      <div style={correctionPulseRingStyle} aria-hidden />
      <div style={runeCenterStyle}>
        <GateRune kind="no-go" symbolId={symbolId} crackStrength={Math.max(crackStrength, 0.9)} outcome={null} interactive={false} onTap={() => {}} />
      </div>
      <FumiCompanion
        variant="portrait"
        size={92}
        line="Oops, that one was cracked! Let's watch for it together — try again?"
        center
        bottom={115}
      />
      <button type="button" className="tap-scale" onClick={dismiss} style={correctionDismissButtonStyle}>
        Got it →
      </button>
    </>
  );
}

type TrialRunnerProps = {
  trial: TrialPlan;
  ageBand: AgeBand;
  sessionSeed: string;
  onResult: (result: TrialResult) => void;
  onAdvance: () => void;
};

function TrialRunner({ trial, ageBand, sessionSeed, onResult, onAdvance }: TrialRunnerProps) {
  const [phase, setPhase] = useState<"active" | "feedback" | "iti">("active");
  const [runeOutcome, setRuneOutcome] = useState<RuneOutcome>(null);
  // Lazy useState initializer, not useRef(Date.now()) — the documented
  // React escape hatch for a one-time impure computation during render;
  // TrialRunner is remounted per trial (keyed by trialIndex) so this only
  // ever runs once per trial anyway.
  const [onsetAt] = useState(() => Date.now());
  const resolvedRef = useRef(false);

  const resolve = useCallback(
    (tapped: boolean) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      const reactionTimeMs = tapped ? Date.now() - onsetAt : null;
      const outcome: TrialOutcome = trial.kind === "go" ? (tapped ? "correct-go" : "omission") : tapped ? "commission" : "correct-no-go";
      const visual: RuneOutcome =
        outcome === "correct-go" ? "go-sent" : outcome === "omission" ? "go-missed" : outcome === "commission" ? "no-go-tapped" : "no-go-passed";
      setRuneOutcome(visual);
      onResult({ trialIndex: trial.trialIndex, blockIndex: trial.blockIndex, kind: trial.kind, outcome, reactionTimeMs });
      setPhase("feedback");
    },
    [trial, onResult, onsetAt]
  );

  useEffect(() => {
    // Every rune — Go or No-Go — auto-resolves after its scheduled window
    // (see config.ts's RESPONSE_WINDOW_SCHEDULE): an untapped Go becomes an
    // omission, an untapped No-Go correctly passes, same as a tap resolves
    // either immediately.
    const timer = setTimeout(() => resolve(false), trial.responseWindowMs);
    return () => clearTimeout(timer);
  }, [trial, resolve]);

  useEffect(() => {
    if (phase !== "feedback") return;
    const timer = setTimeout(() => setPhase("iti"), 340);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "iti") return;
    const rng = createRng(`${sessionSeed}-gk-iti-t${trial.trialIndex}`);
    const itiMs = itiForBlock(ageBand, trial.blockIndex, rng);
    const timer = setTimeout(onAdvance, itiMs);
    return () => clearTimeout(timer);
  }, [phase, ageBand, sessionSeed, trial, onAdvance]);

  return (
    <>
      {phase !== "iti" && trial.kind === "no-go" && <ScreenCrack crackStrength={trial.crackStrength} />}
      {phase !== "iti" && (
        <div style={runeCenterStyle}>
          <GateRune kind={trial.kind} symbolId={trial.symbolId} crackStrength={trial.crackStrength} outcome={runeOutcome} interactive={phase === "active"} onTap={() => resolve(true)} />
        </div>
      )}
    </>
  );
}

type GateHudProps = {
  gateStage: number;
  powerPulseKey: number;
  onExit: () => void;
};

function GateHud({ gateStage, powerPulseKey, onExit }: GateHudProps) {
  return (
    <>
      <div style={hudBarStyle}>
        <button type="button" className="tap-scale" onClick={onExit} style={exitButtonStyle} aria-label="Exit game">
          ✕
        </button>
        <GatePowerMeter stage={gateStage} pulseKey={powerPulseKey} />
        <div style={{ width: 40 }} aria-hidden />
      </div>
      <div style={blockIndicatorRowStyle} aria-label={`Gate power stage ${gateStage} of ${TOTAL_BLOCKS}`}>
        {Array.from({ length: TOTAL_BLOCKS }).map((_, i) => (
          <span key={i} style={{ fontSize: 14, opacity: i < gateStage ? 1 : 0.3 }}>
            🐾
          </span>
        ))}
      </div>
    </>
  );
}

// A small floating toast, not a full-screen takeover — the gate scene
// stays visible and alive behind it, so hitting a milestone reads as a
// celebratory beat inside the world rather than an interruption of it.
function BlockMilestone({ stage }: { stage: number }) {
  const label = stage >= TOTAL_BLOCKS ? "Gate Fully Charged!" : `Gate Power ${stage * 25}%!`;
  return (
    <div style={milestoneToastStyle}>
      <span aria-hidden style={{ ...milestoneSparkleStyle, animationDelay: "0s" }}>
        ✦
      </span>
      <Fumi mood="happy" size={36} animate tailWag />
      <div style={milestoneTextStyle}>{label}</div>
      <span aria-hidden style={{ ...milestoneSparkleStyle, animationDelay: "0.3s" }}>
        ✦
      </span>
    </div>
  );
}

type GameCompleteProps = {
  outcome: GameOutcome;
  onPlayAgain: () => void;
  onFinish: () => void;
};

const CONFETTI = [
  { left: "10%", color: "#F0A63C", delay: 0 },
  { left: "22%", color: "#9B5CFF", delay: 0.15 },
  { left: "38%", color: "#F6F5FF", delay: 0.3 },
  { left: "52%", color: "#F0A63C", delay: 0.05 },
  { left: "66%", color: "#9B5CFF", delay: 0.4 },
  { left: "80%", color: "#F6F5FF", delay: 0.2 },
  { left: "92%", color: "#F0A63C", delay: 0.35 },
];

function GameComplete({ outcome, onPlayAgain, onFinish }: GameCompleteProps) {
  const seconds = Math.round(outcome.gameplayDurationMs / 1000);
  const timeLabel = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const avgRtLabel = outcome.avgResponseTimeMs !== null ? `${outcome.avgResponseTimeMs} ms` : "—";

  return (
    <div style={missionCompleteStyle}>
      <Ambient tint="violet" />
      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {CONFETTI.map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: -20,
              left: c.left,
              width: 8,
              height: 8,
              borderRadius: 2,
              background: c.color,
              animation: `confetti-fall 1600ms ease-in ${c.delay}s both`,
            }}
          />
        ))}
      </div>

      <FumiCompanion mood="happy" size={96} tailWag />
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-soft)" }}>Gate Open!</div>

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
        <SummaryStat label="Clean Accuracy" value={`${Math.round(outcome.cleanAccuracyPct)}%`} />
        <SummaryStat label="Corrupted Tapped" value={`${outcome.corruptedTapped}`} />
        <SummaryStat label="Clean Missed" value={`${outcome.cleanMissed}`} />
        <SummaryStat label="Avg Response" value={avgRtLabel} />
        <SummaryStat label="Duration" value={timeLabel} />
        <SummaryStat label="Clean Tapped" value={`${outcome.correctCleanTapped}/${outcome.totalCleanPresented}`} />
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

// Same plate/wordmark treatment as Pathfinder Sweep's region-intro — one
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

// A gate "console readout" panel — dark glass + cyan corner brackets — in
// place of a cutesy white speech bubble, so the mascot reads as relaying a
// system message through the gate rather than just chatting in a forest.
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

// Same CTA treatment as Pathfinder Sweep — shared gradient-cta token, not
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

// Lands the rune exactly on the circle already carved into gate.png
// (see config.ts's GATE_CIRCLE) rather than floating at an arbitrary
// screen position that doesn't line up with the artwork.
const runeCenterStyle: React.CSSProperties = {
  position: "absolute",
  left: GATE_CIRCLE.centerX,
  top: GATE_CIRCLE.centerY,
  transform: "translate(-50%, -50%)",
  zIndex: 10,
};

const tutorialHeaderStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE_AREA_TOP + 8,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  zIndex: 20,
};

// Solid plate, not just floating text — the archway art has its own gold
// ornament right at this spot, and plain text on top of it was close to
// unreadable (gold-on-gold, same spot as the diamond carving).
const tutorialHeaderPlateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  background: "rgba(6,12,14,0.8)",
  border: "1px solid rgba(94,234,212,0.3)",
  borderRadius: 999,
  padding: "6px 16px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
};

const tutorialTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-title), cursive",
  fontSize: 17,
  fontWeight: 700,
  color: "var(--color-gold)",
  textShadow: "0 2px 4px rgba(0,0,0,0.6)",
};

const tutorialDotsRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const tutorialDotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "var(--color-gold)",
  boxShadow: "0 0 4px rgba(240,166,60,0.6)",
  transition: "opacity 200ms ease, transform 200ms ease",
};

const correctionPulseRingStyle: React.CSSProperties = {
  position: "absolute",
  left: GATE_CIRCLE.centerX,
  top: GATE_CIRCLE.centerY,
  width: GATE_CIRCLE.outerDiameter + 30,
  height: GATE_CIRCLE.outerDiameter + 30,
  marginLeft: -(GATE_CIRCLE.outerDiameter + 30) / 2,
  marginTop: -(GATE_CIRCLE.outerDiameter + 30) / 2,
  borderRadius: "50%",
  border: "3px solid rgba(155,92,255,0.65)",
  boxShadow: "0 0 24px rgba(155,92,255,0.5)",
  animation: "shield-pulse 1.6s ease-out infinite",
  zIndex: 9,
};

const correctionDismissButtonStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 40,
  left: 24,
  right: 24,
  minHeight: 48,
  border: "none",
  borderRadius: 999,
  background: "linear-gradient(135deg, #F0C572, #D9A94F)",
  color: "#1A1206",
  fontWeight: 800,
  fontSize: 14.5,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(240,166,60,0.4)",
};

const hudBarStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE_AREA_TOP,
  left: 0,
  right: 0,
  height: 56,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 14px",
  zIndex: 25,
};

const blockIndicatorRowStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE_AREA_TOP + 54,
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  zIndex: 25,
};

const exitButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "1px solid rgba(240,166,60,0.35)",
  background: "rgba(10,8,20,0.78)",
  color: "var(--color-soft)",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const ruleReminderStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 120,
  left: "50%",
  transform: "translate(-50%, 0)",
  width: 280,
  textAlign: "center",
  padding: "12px 16px",
  borderRadius: 16,
  fontSize: 12.5,
  lineHeight: 1.5,
  fontWeight: 600,
  color: "var(--color-soft)",
  background: "rgba(7,6,28,0.94)",
  border: "1px solid rgba(196,181,253,0.4)",
  zIndex: 23,
  animation: "rule-reminder-in 260ms var(--ease-spring) both",
};

// A screen-wide "you got that wrong" beat — a red vignette flash across
// the whole gate, not just the rune's own circle, plus a jolt on the gate
// backdrop itself (see "error-vignette-pulse" and its paired "shake-x" use
// in GateRune), so tapping a corrupted rune lands as a real mistake rather
// than a small local color change.
const errorVignetteStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 30,
  background: "radial-gradient(ellipse at 50% 46%, transparent 45%, rgba(160,10,10,0.55) 100%)",
  animation: "error-vignette-pulse 480ms ease-out forwards",
};

const milestoneToastStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE_AREA_TOP + 96,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  borderRadius: 999,
  background: "rgba(10,8,20,0.88)",
  border: "1px solid rgba(240,166,60,0.55)",
  boxShadow: "0 10px 26px rgba(0,0,0,0.5), 0 0 22px rgba(240,166,60,0.35)",
  zIndex: 40,
  pointerEvents: "none",
  animation: "milestone-toast-in 320ms var(--ease-pop) both, milestone-toast-out 320ms ease-in 1080ms forwards",
};

const milestoneSparkleStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#F0C572",
  textShadow: "0 0 8px rgba(240,166,60,0.8)",
  animation: "twinkle 1.2s ease-in-out infinite",
};

const milestoneTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 14,
  fontWeight: 800,
  color: "#F0C572",
  textShadow: "0 0 12px rgba(240,166,60,0.6)",
  whiteSpace: "nowrap",
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
