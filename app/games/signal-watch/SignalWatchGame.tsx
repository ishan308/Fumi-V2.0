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
import { SignalCounter } from "./components/SignalCounter";
import { EnergyMeter } from "./components/EnergyMeter";
import { ProgressTrack } from "./components/ProgressTrack";
import { Ambient } from "../../components/Ambient";
import { Typewriter } from "../../components/Typewriter";
import { FumiCompanion } from "../../components/FumiCompanion";
import { FumiPortrait } from "../../components/FumiPortrait";
import { reportGame } from "./lib/sessionReporter";

type GameScreen = "region-intro" | "playing" | "complete";
type SignalCounts = Record<SignalType, number>;

const ZERO_COUNTS: SignalCounts = { leaf: 0, wave: 0, sun: 0 };
const SIGNAL_ORDER: SignalType[] = ["leaf", "wave", "sun"];

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

    if (loaded === currentRound.target) {
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
  }, [currentRound, loaded, success, paused, advanceRound]);

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
        <Ambient tint="forest" />
        <div style={playingWrapStyle}>
          <div style={headerRowStyle}>
            <button type="button" className="tap-scale" onClick={handleExit} style={iconButtonStyle} aria-label="Exit game">
              ←
            </button>
            <ProgressTrack total={rounds.length} currentIndex={roundIndex} />
            <button
              type="button"
              className="tap-scale"
              onClick={() => setPaused((p) => !p)}
              style={iconButtonStyle}
              aria-label={paused ? "Resume game" : "Pause game"}
            >
              {paused ? "▶" : "❚❚"}
            </button>
          </div>

          <div style={titleBlockStyle}>
            <div style={gameTitleStyle}>Signal Watch</div>
            <div style={subtitleStyle}>Use the signals to reach the total energy needed for the river.</div>
          </div>

          <div style={infoRowStyle}>
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>Total Energy Needed</div>
              <div style={infoValueStyle}>{currentRound.target}</div>
            </div>
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>Signal Values</div>
              <div style={signalValuesRowStyle}>
                {SIGNAL_ORDER.map((type) => (
                  <span key={type} style={{ color: SIGNAL_THEME[type].color, fontWeight: 800, fontSize: 12 }}>
                    {SIGNAL_THEME[type].label[0]}={currentRound.values[type]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...countersRowStyle, animation: shakeKey > 0 ? "shake-x 260ms ease-in-out" : undefined }}>
            {SIGNAL_ORDER.map((type) => (
              <SignalCounter
                key={type}
                type={type}
                value={currentRound.values[type]}
                count={counts[type]}
                disabled={success || paused}
                onIncrement={() => handleIncrement(type)}
                onDecrement={() => handleDecrement(type)}
              />
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <EnergyMeter loaded={loaded} target={currentRound.target} />

          <button
            type="button"
            className="tap-scale"
            onClick={handleSendEnergy}
            disabled={success || paused}
            style={{
              ...sendButtonStyle,
              opacity: paused ? 0.45 : 1,
              background: success
                ? "linear-gradient(135deg, #5FBE63, #3E9A42)"
                : loaded === currentRound.target
                  ? "var(--gradient-cta)"
                  : "#5B6472",
            }}
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
      <Ambient tint="forest" />

      <div style={gameTitleWrapStyle}>
        <div aria-hidden style={titleOrnamentStyle}>
          <span style={titleOrnamentLineStyle} />
          <span style={{ fontSize: 11 }}>✦</span>
          <span style={titleOrnamentLineStyle} />
        </div>
        <div style={titleHighlightStyle}>
          <div style={questLabelStyle}>River Relay</div>
          <div style={bigTitleStyle}>Signal Watch</div>
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

const titleHighlightStyle: React.CSSProperties = {
  background: "rgba(8,5,18,0.78)",
  border: "1px solid rgba(240,166,60,0.4)",
  borderRadius: 14,
  padding: "6px 24px",
  boxShadow: "0 10px 26px rgba(0,0,0,0.55)",
};

const questLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "var(--color-lavender)",
  opacity: 0.85,
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

const bigTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-title), cursive",
  fontSize: 30,
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

const playingWrapStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  paddingTop: SAFE_AREA_TOP + 8,
  paddingBottom: 16,
  paddingLeft: 16,
  paddingRight: 16,
  gap: 14,
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const iconButtonStyle: React.CSSProperties = {
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

const titleBlockStyle: React.CSSProperties = {
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const gameTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 18,
  fontWeight: 800,
  color: "var(--color-gold)",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--color-lavender)",
  opacity: 0.85,
  lineHeight: 1.4,
};

const infoRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
};

const infoCardStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(10,8,20,0.78)",
  border: "1px solid rgba(240,166,60,0.35)",
  borderRadius: 14,
  padding: "8px 10px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: 0.3,
  textTransform: "uppercase",
  color: "var(--color-lavender)",
  opacity: 0.8,
  textAlign: "center",
};

const infoValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: "var(--color-gold)",
  fontFamily: "var(--font-display), var(--font-body), system-ui",
};

const signalValuesRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
};

const countersRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 10,
};

const sendButtonStyle: React.CSSProperties = {
  minHeight: 52,
  border: "none",
  borderRadius: 999,
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "var(--shadow-cta)",
  transition: "opacity 300ms ease, background 300ms ease",
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
