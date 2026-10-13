"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { AgeBand, GameOutcome, RoundPlan, RoundResult, SignalType } from "./types";
import {
  MAX_COUNT_PER_SIGNAL,
  NARRATION_TEXT,
  PLAY_AREA,
  RETRY_SHAKE_MS,
  ROUND_SUCCESS_HOLD_MS,
  SAFE_AREA_TOP,
  SEND_ENERGY_LABEL,
  SIGNAL_THEME,
} from "./config";
import { buildRoundSession } from "./engine/sessionPlanner";
import { computeGameOutcome } from "./engine/metrics";
import { Ambient } from "../../components/Ambient";
import { SignalBackdrop } from "./components/SignalBackdrop";
import { Typewriter } from "../../components/Typewriter";
import { FumiCompanion } from "../../components/FumiCompanion";
import { FumiPortrait } from "../../components/FumiPortrait";
import { GameTitleBanner } from "../../components/GameTitleBanner";
import { PlayButton } from "../../components/PlayButton";
import { reportGame } from "./lib/sessionReporter";

type GameScreen = "region-intro" | "playing" | "complete";
type SignalCounts = Record<SignalType, number>;

const ZERO_COUNTS: SignalCounts = { leaf: 0, wave: 0, sun: 0 };
const SIGNAL_ORDER: SignalType[] = ["leaf", "wave", "sun"];

// Fumi's per-round line — general instructions/motivation early on, with
// a concrete hint on the harder later rounds (keyed by 0-based round).
const FUMI_TIPS: string[] = [
  "Tap + to add signals until you reach the target — use all three!",
  "Nice start! Remember every round needs at least one of each.",
  "Mix big and small signals to land exactly on the target.",
  "Sun is worth the most — start big, then fine-tune with Leaf.",
  "You've got this! Try a couple of Suns first.",
  "Think: how many Suns fit under the target without going over?",
  "Bigger target now — lean on Sun, then adjust with Wave.",
  "Almost there, hero! Balance all three to hit it exactly.",
  "Tricky one: add Suns first, then Waves, then Leaf to top up.",
  "Final round! Fill with Suns, then top up with the rest. Go!",
];

function fumiTip(roundIndex: number): string {
  return FUMI_TIPS[roundIndex] ?? FUMI_TIPS[FUMI_TIPS.length - 1];
}

export type SignalWatchGameProps = {
  ageBand: AgeBand;
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

export function SignalWatchGame({ onExit }: SignalWatchGameProps) {
  const [screen, setScreen] = useState<GameScreen>("region-intro");
  const [narrationDone, setNarrationDone] = useState(false);

  const rounds = useMemo(() => buildRoundSession(), []);
  const [roundIndex, setRoundIndex] = useState(0);
  const [counts, setCounts] = useState<SignalCounts>(ZERO_COUNTS);
  const [shakeKey, setShakeKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<GameOutcome | null>(null);
  const [veil, setVeil] = useState<{ opacity: number; message: string | null }>({ opacity: 0, message: null });

  const startedAtRef = useRef(0);
  const roundStartedAtRef = useRef(0);
  const attemptsRef = useRef(0);
  const resultsRef = useRef<RoundResult[]>([]);

  const currentRound: RoundPlan | undefined = rounds[roundIndex];
  const loaded = currentRound
    ? SIGNAL_ORDER.reduce((sum, type) => sum + counts[type] * currentRound.values[type], 0)
    : 0;

  const runTransition = useCallback((action: () => void, message: string | null = null) => {
    setVeil({ opacity: 1, message });
    const holdMs = message ? 550 : 120;
    setTimeout(() => {
      action();
      setTimeout(() => setVeil({ opacity: 0, message: null }), holdMs);
    }, 380);
  }, []);

  const resetRound = useCallback(() => {
    setCounts(ZERO_COUNTS);
    setSuccess(false);
    attemptsRef.current = 0;
    roundStartedAtRef.current = Date.now();
  }, []);

  const handleStartAdventure = useCallback(() => {
    startedAtRef.current = Date.now();
    setRoundIndex(0);
    resetRound();
    runTransition(() => setScreen("playing"));
  }, [resetRound, runTransition]);

  const finishGame = useCallback(() => {
    const endedAt = Date.now();
    const outcome = computeGameOutcome(resultsRef.current, rounds.length, startedAtRef.current, endedAt, "completed");
    reportGame(outcome);
    setLastOutcome(outcome);
    runTransition(() => setScreen("complete"));
  }, [rounds.length, runTransition]);

  // Leaving mid-session (the header's back arrow) still reports whatever
  // rounds were actually solved before the player quit, tagged "exited"
  // rather than "completed".
  const handleExit = useCallback(() => {
    const outcome = computeGameOutcome(resultsRef.current, rounds.length, startedAtRef.current, Date.now(), "exited");
    reportGame(outcome);
    onExit();
  }, [rounds.length, onExit]);

  const advanceRound = useCallback(() => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= rounds.length) {
      finishGame();
    } else {
      setRoundIndex(nextIndex);
      resetRound();
    }
  }, [roundIndex, rounds.length, finishGame, resetRound]);

  const handleIncrement = useCallback((type: SignalType) => {
    if (success || paused) return;
    setCounts((prev) => ({ ...prev, [type]: Math.min(MAX_COUNT_PER_SIGNAL, prev[type] + 1) }));
  }, [success, paused]);

  const handleDecrement = useCallback((type: SignalType) => {
    if (success || paused) return;
    setCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
  }, [success, paused]);

  const handleSendEnergy = useCallback(() => {
    if (!currentRound || success || paused) return;
    attemptsRef.current += 1;

    // Must use at least one of every signal type — hitting the target
    // with only some of the three doesn't count.
    const usedAllSignals = SIGNAL_ORDER.every((type) => counts[type] > 0);

    if (loaded === currentRound.target && usedAllSignals) {
      setSuccess(true);
      resultsRef.current = [
        ...resultsRef.current,
        {
          roundNumber: currentRound.roundNumber,
          target: currentRound.target,
          attempts: attemptsRef.current,
          solvedFirstTry: attemptsRef.current === 1,
          durationMs: Date.now() - roundStartedAtRef.current,
        },
      ];
      setTimeout(advanceRound, ROUND_SUCCESS_HOLD_MS);
    } else {
      setShakeKey((k) => k + 1);
      setTimeout(() => setShakeKey(0), RETRY_SHAKE_MS);
    }
  }, [currentRound, loaded, counts, success, paused, advanceRound]);

  const handlePlayAgain = useCallback(() => {
    setNarrationDone(false);
    runTransition(() => setScreen("region-intro"));
  }, [runTransition]);

  let screenContent: React.ReactNode = null;

  if (screen === "region-intro") {
    screenContent = <RegionIntro narrationDone={narrationDone} onNarrationDone={() => setNarrationDone(true)} onStart={handleStartAdventure} />;
  } else if (screen === "playing" && currentRound) {
    screenContent = (
      <>
        {/* The full reference scene (fountains, wooden cards, buttons —
            all pre-drawn), with this screen's own UI reduced to just the
            dynamic numbers/text and invisible hit-targets positioned on
            top of that pre-drawn chrome, not competing chrome of its
            own. Percent positions below were measured directly off the
            941x1672 source art; see SignalBackdrop's own note on why
            image-percent ≈ box-percent here (negligible crop).

            This whole layer (backdrop + every overlay) is shifted down
            as one rigid unit via sceneShiftStyle, clearing the device
            notch at the top — shifting the backdrop image alone would
            leave every overlay's measured percent position pointing at
            the wrong spot underneath it. */}
        <div style={sceneShiftStyle}>
        <SignalBackdrop variant="full" />

        <button type="button" onClick={handleExit} style={hitExitStyle} aria-label="Exit game" />
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          style={hitPauseStyle}
          aria-label={paused ? "Resume game" : "Pause game"}
        />

        {/* Lights up the painted progress-bar nodes as rounds advance:
            10 rounds spread across the bar's 4 grey nodes (the 1st, lit
            orb is the start). */}
        {PROGRESS_NODE_X.map((x, k) => {
          const lit = roundIndex >= (k + 1) * (rounds.length / PROGRESS_NODE_X.length);
          return <div key={k} aria-hidden style={{ ...progressNodeStyle, left: `${x}%`, opacity: lit ? 1 : 0 }} />;
        })}

        <div style={fumiGroupStyle}>
          <FumiPortrait size={78} />
          <div style={fumiBubbleStyle}>
            {fumiTip(roundIndex)}
            <div style={fumiBubbleTailStyle} />
          </div>
        </div>

        <div style={overlayTotalLabelStyle}>Total Energy Needed</div>
        <div style={overlayTotalValueStyle}>{currentRound.target}</div>

        <div style={overlaySignalLabelStyle}>Signal Values</div>
        {SIGNAL_ORDER.map((type, i) => (
          <div key={type} style={{ ...overlaySignalValueStyle, left: `${[61.6, 74.4, 88.2][i]}%` }}>
            ={currentRound.values[type]}
          </div>
        ))}

        {SIGNAL_ORDER.map((type, i) => (
          <button
            key={`${type}-minus`}
            type="button"
            onClick={() => handleDecrement(type)}
            disabled={success || paused}
            aria-label={`Remove one ${SIGNAL_THEME[type].label}`}
            style={{ ...hitStepperStyle, left: `${[8, 40.4, 72.8][i]}%`, top: "68.5%" }}
          />
        ))}
        {SIGNAL_ORDER.map((type, i) => (
          <button
            key={`${type}-plus`}
            type="button"
            onClick={() => handleIncrement(type)}
            disabled={success || paused}
            aria-label={`Add one ${SIGNAL_THEME[type].label}`}
            style={{ ...hitStepperStyle, left: `${[27.6, 60.0, 92.5][i]}%`, top: "68.5%" }}
          />
        ))}
        {SIGNAL_ORDER.map((type, i) => (
          <div
            key={`${type}-count`}
            style={{
              ...overlayCountStyle,
              left: `${[18.1, 49.95, 82.4][i]}%`,
              animation: shakeKey > 0 ? "shake-x 260ms ease-in-out" : undefined,
            }}
          >
            {counts[type]}
          </div>
        ))}

        <div style={overlayEnergyLabelStyle}>Energy Loaded</div>
        <div style={overlayEnergyValueStyle}>
          {loaded} / {currentRound.target}
        </div>

        <button
          type="button"
          onClick={handleSendEnergy}
          disabled={success || paused}
          style={hitSendStyle}
          aria-label={SEND_ENERGY_LABEL}
        >
          {success ? "River Flowing! ✦" : SEND_ENERGY_LABEL}
        </button>
        </div>

        {paused && <PauseOverlay onResume={() => setPaused(false)} onExit={handleExit} />}
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
      <SignalBackdrop />

      <div style={gameTitleWrapStyle}>
        <div style={questLabelStyle}>River Relay</div>
        <GameTitleBanner title="Signal Watch" />
      </div>

      <div style={narrationGroupStyle}>
        <div style={narrationBubbleStyle}>
          <Typewriter text={NARRATION_TEXT} onDone={onNarrationDone} speedMultiplier={0.9} />
          <div style={narrationBubbleTailStyle} />
        </div>
        <FumiPortrait />
      </div>

      <PlayButton visible={narrationDone} onClick={onStart} />
    </>
  );
}

function PauseOverlay({ onResume, onExit }: { onResume: () => void; onExit: () => void }) {
  return (
    <div style={pauseOverlayStyle}>
      <div style={pauseCardStyle}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-soft)" }}>Paused</div>
        <button type="button" className="tap-scale" onClick={onResume} style={continueButtonStyleInline}>
          Resume
        </button>
        <button type="button" className="tap-scale" onClick={onExit} style={secondaryButtonStyle}>
          Exit
        </button>
      </div>
    </div>
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
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-soft)" }}>River Restored!</div>

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
        <SummaryStat label="Rounds Completed" value={`${outcome.roundsCompleted}/${outcome.totalRoundsPresented}`} />
        <SummaryStat label="Perfect Rounds" value={`${outcome.perfectRounds}`} />
        <SummaryStat label="Total Attempts" value={`${outcome.totalAttempts}`} />
        <SummaryStat label="Avg Attempts" value={outcome.avgAttemptsPerRound.toFixed(1)} />
        <SummaryStat label="Duration" value={timeLabel} />
        <SummaryStat label="Completion" value={`${Math.round(outcome.completionRatePct)}%`} />
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

const veilMessageStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 20,
  fontWeight: 800,
  color: "var(--color-soft)",
  animation: "bubble-pop 260ms var(--ease-pop) both",
};

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

const questLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "var(--color-lavender)",
  opacity: 0.85,
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
  fontSize: 13.5,
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

const continueButtonStyleInline: React.CSSProperties = {
  minHeight: 50,
  border: "none",
  borderRadius: 999,
  background: "var(--gradient-cta)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "var(--shadow-cta)",
  width: "100%",
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
  width: "100%",
};

// Every position below is a measured percent of the 941x1672 background
// art (see SignalBackdrop's "full" variant) — this screen's own job is
// just to sit dynamic numbers and invisible hit-targets exactly on top of
// that pre-drawn chrome, not to draw competing chrome of its own.
// Shifts the backdrop + every overlay down together, clearing the device
// notch — the wrapper keeps the full 700px height (bottom: -40 extends it
// 40px past the scene's own bottom edge) so every existing percent-based
// "top" position below still resolves against the same 700px reference
// it was measured against, just physically moved down; only the bottom
// 40px of background art (plain water/rocks, no UI) gets clipped by the
// scene wrapper's own overflow: hidden.
const sceneShiftStyle: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };

// Fumi + speech bubble floating in the sky band between the progress bar
// and the Total Energy Needed cards (the empty area on this screen).
const fumiGroupStyle: React.CSSProperties = {
  position: "absolute",
  top: "15%",
  left: 10,
  right: 10,
  display: "flex",
  alignItems: "center",
  gap: 4,
};

const fumiBubbleStyle: React.CSSProperties = {
  position: "relative",
  flex: 1,
  background: "rgba(246,245,255,0.97)",
  color: "var(--color-ink)",
  borderRadius: 16,
  padding: "10px 12px",
  fontSize: 12.5,
  fontWeight: 700,
  lineHeight: 1.4,
  boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
};

const fumiBubbleTailStyle: React.CSSProperties = {
  position: "absolute",
  left: -7,
  top: "50%",
  marginTop: -7,
  width: 14,
  height: 14,
  background: "rgba(246,245,255,0.97)",
  transform: "rotate(45deg)",
};

// Screen-% centers of the 4 grey nodes painted on the progress bar (the
// lit orb to their left is the start). A glowing dot is overlaid on each
// as the player advances through the rounds.
const PROGRESS_NODE_X = [48.7, 60.3, 71.8, 83.3];
const progressNodeStyle: React.CSSProperties = {
  position: "absolute",
  top: "6.5%",
  width: 15,
  height: 15,
  borderRadius: "50%",
  transform: "translate(-50%, -50%)",
  background: "radial-gradient(circle, #CFF0FF, #3DA5E8 70%)",
  boxShadow: "0 0 8px rgba(79,168,232,0.95)",
  transition: "opacity 300ms ease",
  pointerEvents: "none",
};

const anchorCenter: React.CSSProperties = { position: "absolute", transform: "translate(-50%, -50%)" };
const hitButton: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: 0 };

const hitExitStyle: React.CSSProperties = { ...anchorCenter, ...hitButton, left: "9.4%", top: "4.8%", width: 48, height: 48 };
const hitPauseStyle: React.CSSProperties = { ...anchorCenter, ...hitButton, left: "89.8%", top: "4.8%", width: 48, height: 48 };
const hitStepperStyle: React.CSSProperties = { ...anchorCenter, ...hitButton, width: 44, height: 44 };

const overlayLabel: React.CSSProperties = {
  ...anchorCenter,
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: 0.3,
  textTransform: "uppercase",
  color: "#F3D79A",
  textAlign: "center",
  whiteSpace: "nowrap",
  textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.6)",
};

const overlayValue: React.CSSProperties = {
  ...anchorCenter,
  fontWeight: 800,
  color: "#FFF6E0",
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  textShadow: "0 2px 4px rgba(0,0,0,0.7)",
  whiteSpace: "nowrap",
};

const overlayTotalLabelStyle: React.CSSProperties = { ...overlayLabel, left: "27.6%", top: "31.5%" };
const overlayTotalValueStyle: React.CSSProperties = { ...overlayValue, left: "35%", top: "35.8%", fontSize: 24 };
const overlaySignalLabelStyle: React.CSSProperties = { ...overlayLabel, left: "74.4%", top: "30.5%" };
const overlaySignalValueStyle: React.CSSProperties = { ...overlayValue, top: "38%", fontSize: 12, color: "#0a0814", textShadow: "none" };
const overlayCountStyle: React.CSSProperties = { ...overlayValue, top: "68.5%", fontSize: 18 };
const overlayEnergyLabelStyle: React.CSSProperties = { ...overlayLabel, left: "51%", top: "77.8%" };
const overlayEnergyValueStyle: React.CSSProperties = { ...overlayValue, left: "52%", top: "81%", fontSize: 18 };

const hitSendStyle: React.CSSProperties = {
  position: "absolute",
  left: "21%",
  width: "58%",
  top: "85.3%",
  height: "7.6%",
  // Always-active green pill drawn over the art's (grey, disabled-looking)
  // painted button.
  background: "linear-gradient(180deg, #A3E373 0%, #72C644 47%, #4C9E2A 100%)",
  border: "2px solid #35701A",
  borderRadius: 999,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  textShadow: "0 2px 3px rgba(0,0,0,0.45)",
  boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.4)",
  transition: "opacity 300ms ease",
};

const pauseOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 150,
  background: "rgba(5,4,12,0.78)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
};

const pauseCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 280,
  background: "rgba(16,13,35,0.92)",
  border: "1px solid rgba(240,166,60,0.35)",
  borderRadius: 20,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 14,
  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
};

const missionCompleteStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
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
