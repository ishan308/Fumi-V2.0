"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { AgeBand, GameOutcome, GemType, RoundPlan, RoundResult } from "./types";
import { NARRATION_TEXT, PLAY_AREA, RETRY_SHAKE_MS, ROUND_SUCCESS_HOLD_MS, SAFE_AREA_TOP, SEND_CARTS_LABEL } from "./config";
import { buildRoundSession, shufflePalette } from "./engine/sessionPlanner";
import { computeGameOutcome } from "./engine/metrics";
import { GemCard } from "./components/GemCard";
import { CartTrack } from "./components/CartTrack";
import { ClueList } from "./components/ClueList";
import { YardBackdrop } from "./components/YardBackdrop";
import { Ambient } from "../../components/Ambient";
import { Typewriter } from "../../components/Typewriter";
import { FumiCompanion } from "../../components/FumiCompanion";
import { FumiPortrait } from "../../components/FumiPortrait";
import { reportGame } from "./lib/sessionReporter";

type GameScreen = "region-intro" | "playing" | "complete";

function generateSeed(): string {
  return `syr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type SwitchYardRescueGameProps = {
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

export function SwitchYardRescueGame({ onExit }: SwitchYardRescueGameProps) {
  const [sessionSeed] = useState(() => generateSeed());
  const [screen, setScreen] = useState<GameScreen>("region-intro");
  const [narrationDone, setNarrationDone] = useState(false);

  const rounds = useMemo(() => buildRoundSession(), []);
  const [roundIndex, setRoundIndex] = useState(0);
  const [palette, setPalette] = useState<GemType[]>([]);
  const [slots, setSlots] = useState<(GemType | null)[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<GameOutcome | null>(null);
  const [veil, setVeil] = useState<{ opacity: number; message: string | null }>({ opacity: 0, message: null });

  const startedAtRef = useRef(0);
  const roundStartedAtRef = useRef(0);
  const attemptsRef = useRef(0);
  const resultsRef = useRef<RoundResult[]>([]);

  const currentRound: RoundPlan | undefined = rounds[roundIndex];

  const runTransition = useCallback((action: () => void, message: string | null = null) => {
    setVeil({ opacity: 1, message });
    const holdMs = message ? 550 : 120;
    setTimeout(() => {
      action();
      setTimeout(() => setVeil({ opacity: 0, message: null }), holdMs);
    }, 380);
  }, []);

  const resetRound = useCallback(
    (index: number) => {
      const round = rounds[index];
      if (!round) return;
      setPalette(shufflePalette(round, sessionSeed));
      setSlots(new Array(round.cards.length).fill(null));
      setSuccess(false);
      attemptsRef.current = 0;
      roundStartedAtRef.current = Date.now();
    },
    [rounds, sessionSeed]
  );

  const handleStartAdventure = useCallback(() => {
    startedAtRef.current = Date.now();
    setRoundIndex(0);
    resetRound(0);
    runTransition(() => setScreen("playing"));
  }, [resetRound, runTransition]);

  const finishGame = useCallback(() => {
    const endedAt = Date.now();
    const outcome = computeGameOutcome(resultsRef.current, rounds.length, startedAtRef.current, endedAt);
    reportGame(outcome);
    setLastOutcome(outcome);
    runTransition(() => setScreen("complete"));
  }, [rounds.length, runTransition]);

  const advanceRound = useCallback(() => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= rounds.length) {
      finishGame();
    } else {
      setRoundIndex(nextIndex);
      resetRound(nextIndex);
    }
  }, [roundIndex, rounds.length, finishGame, resetRound]);

  const handlePaletteTap = useCallback(
    (gem: GemType, paletteIndex: number) => {
      if (success) return;
      const emptyIndex = slots.findIndex((s) => s === null);
      if (emptyIndex === -1) return;
      setSlots((prev) => {
        const next = [...prev];
        next[emptyIndex] = gem;
        return next;
      });
      setPalette((prev) => prev.filter((_, i) => i !== paletteIndex));
    },
    [slots, success]
  );

  const handleSlotRemove = useCallback(
    (slotIndex: number) => {
      if (success) return;
      const gem = slots[slotIndex];
      if (!gem) return;
      setSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
      setPalette((prev) => [...prev, gem]);
    },
    [slots, success]
  );

  const handleSendCarts = useCallback(() => {
    if (!currentRound || success) return;
    if (slots.some((s) => s === null)) return;
    attemptsRef.current += 1;

    const isCorrect = currentRound.correctOrder.every((gem, i) => slots[i] === gem);
    if (isCorrect) {
      setSuccess(true);
      resultsRef.current = [
        ...resultsRef.current,
        {
          roundNumber: currentRound.roundNumber,
          cardCount: currentRound.cards.length,
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
  }, [currentRound, slots, success, advanceRound]);

  const handlePlayAgain = useCallback(() => {
    setNarrationDone(false);
    runTransition(() => setScreen("region-intro"));
  }, [runTransition]);

  const allSlotsFilled = slots.length > 0 && slots.every((s) => s !== null);

  let screenContent: React.ReactNode = null;

  if (screen === "region-intro") {
    screenContent = <RegionIntro narrationDone={narrationDone} onNarrationDone={() => setNarrationDone(true)} onStart={handleStartAdventure} />;
  } else if (screen === "playing" && currentRound) {
    screenContent = (
      <>
        <YardBackdrop />
        <div style={playingWrapStyle}>
          <div style={headerRowStyle}>
            <button type="button" className="tap-scale" onClick={onExit} style={exitButtonStyle} aria-label="Exit game">
              ✕
            </button>
            <div style={roundCounterStyle}>
              Round {currentRound.roundNumber} of {rounds.length}
            </div>
            <div style={{ width: 34 }} aria-hidden />
          </div>

          <ClueList rules={currentRound.rules} />

          <div style={paletteRowStyle}>
            {palette.map((gem, i) => (
              <GemCard key={`${gem}-${i}`} gem={gem} interactive={!success} onTap={() => handlePaletteTap(gem, i)} />
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div style={trackLabelStyle}>{success ? "Power station restarting!" : "Carts, in order:"}</div>
          <CartTrack slots={slots} interactive={!success} shake={shakeKey > 0} onRemove={handleSlotRemove} />

          <button
            type="button"
            className="tap-scale"
            onClick={handleSendCarts}
            disabled={!allSlotsFilled || success}
            style={{
              ...sendButtonStyle,
              opacity: allSlotsFilled && !success ? 1 : 0.45,
              pointerEvents: allSlotsFilled && !success ? "auto" : "none",
              background: success ? "linear-gradient(135deg, #5FBE63, #3E9A42)" : "var(--gradient-cta)",
            }}
          >
            {success ? "Restarted! ✦" : SEND_CARTS_LABEL}
          </button>
        </div>
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
      <YardBackdrop />

      <div style={gameTitleWrapStyle}>
        <div aria-hidden style={titleOrnamentStyle}>
          <span style={titleOrnamentLineStyle} />
          <span style={{ fontSize: 11 }}>✦</span>
          <span style={titleOrnamentLineStyle} />
        </div>
        <div style={titleHighlightStyle}>
          <div style={gameTitleStyle}>Switch Yard Rescue</div>
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
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-soft)" }}>Power Restored!</div>

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
  fontSize: 32,
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

const playingWrapStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  paddingTop: SAFE_AREA_TOP + 8,
  paddingBottom: 16,
  paddingLeft: 16,
  paddingRight: 16,
  gap: 12,
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
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

const roundCounterStyle: React.CSSProperties = {
  padding: "7px 16px",
  borderRadius: 999,
  background: "rgba(10,8,20,0.8)",
  border: "1px solid rgba(240,166,60,0.4)",
  color: "var(--color-gold)",
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 12.5,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const paletteRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "center",
};

const trackLabelStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 11.5,
  fontWeight: 700,
  color: "var(--color-lavender)",
  opacity: 0.85,
};

const sendButtonStyle: React.CSSProperties = {
  minHeight: 50,
  border: "none",
  borderRadius: 999,
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "var(--shadow-cta)",
  transition: "opacity 300ms ease, background 300ms ease",
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
