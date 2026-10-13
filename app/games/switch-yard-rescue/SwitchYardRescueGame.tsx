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
import { GameTitleBanner } from "../../components/GameTitleBanner";
import { PlayButton } from "../../components/PlayButton";
import { reportGame } from "./lib/sessionReporter";

type GameScreen = "region-intro" | "tutorial" | "playing" | "complete";

// The tutorial's one job: teach the drag gesture with a few trivial
// gem-into-cart drops, reusing the same palette/slots state and drag
// handlers the real rounds use (not a separate parallel mechanic) — three
// stones and three carts, loaded in any order (no clue logic), so the
// gesture learned is exactly the one the real rounds need.
const TUTORIAL_GEMS: GemType[] = ["moss", "river", "sunstone"];
const TUTORIAL_HOLD_MS = 800;

// Where a dragged gem came from — its own palette tray, or another cart
// it's being moved/swapped out of. GemType alone identifies it since no
// round repeats a gem type across its own cards/palette.
type DragSource = { kind: "palette"; gem: GemType } | { kind: "slot"; index: number; gem: GemType };
type DropTarget = { type: "slot"; index: number } | { type: "palette" };

// Hit-tests a viewport point against whatever cart slot or the palette
// tray is visually underneath it, via the data attributes CartTrack/the
// palette row carry. Pure and stateless so both the live hover indicator
// (on every pointermove) and the actual drop decision (on pointerup) can
// resolve it fresh from real coordinates, rather than the drop trusting a
// hover state that pointermove might never have had a chance to set.
function resolveDropTarget(clientX: number, clientY: number): DropTarget | null {
  const el = document.elementFromPoint(clientX, clientY);
  const slotEl = el?.closest<HTMLElement>("[data-slot-index]");
  if (slotEl) return { type: "slot", index: Number(slotEl.dataset.slotIndex) };
  const paletteEl = el?.closest<HTMLElement>("[data-palette-dropzone]");
  if (paletteEl) return { type: "palette" };
  return null;
}

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

const dragGhostStyle: React.CSSProperties = {
  position: "fixed",
  transform: "translate(-50%, -50%) scale(1.12)",
  pointerEvents: "none",
  zIndex: 500,
  filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.55))",
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
  const [drag, setDrag] = useState<{ source: DragSource; x: number; y: number } | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);

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

  // What "Play" actually does — a one-gem, one-cart practice drop first,
  // not the real Round 1 directly.
  const handleStartAdventure = useCallback(() => {
    setPalette([...TUTORIAL_GEMS]);
    setSlots(new Array(TUTORIAL_GEMS.length).fill(null));
    runTransition(() => setScreen("tutorial"));
  }, [runTransition]);

  // What the tutorial hands off to once its one drag is done.
  const beginRealRound = useCallback(() => {
    startedAtRef.current = Date.now();
    setRoundIndex(0);
    resetRound(0);
    runTransition(() => setScreen("playing"));
  }, [resetRound, runTransition]);

  const finishGame = useCallback(() => {
    const endedAt = Date.now();
    const outcome = computeGameOutcome(resultsRef.current, rounds.length, startedAtRef.current, endedAt, "completed");
    reportGame(outcome);
    setLastOutcome(outcome);
    runTransition(() => setScreen("complete"));
  }, [rounds.length, runTransition]);

  // Leaving mid-session (the header's ✕) still reports whatever rounds
  // were actually solved before the player quit, tagged "exited" rather
  // than "completed" — same metrics shape, just an honest status so
  // partial sessions aren't indistinguishable from finished ones.
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
      resetRound(nextIndex);
    }
  }, [roundIndex, rounds.length, finishGame, resetRound]);

  // Picking up a gem — from the palette or out of a cart — starts a drag.
  // Pointer capture keeps move/up events targeted at the card that was
  // grabbed even once the finger moves elsewhere, so hit-testing what's
  // underneath (via elementFromPoint, below) is all that's needed to know
  // the drop target.
  const beginDrag = useCallback(
    (source: DragSource, e: React.PointerEvent<HTMLDivElement>) => {
      if (success) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ source, x: e.clientX, y: e.clientY });
    },
    [success]
  );

  const handleDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    setHoverTarget(resolveDropTarget(e.clientX, e.clientY));
  }, []);

  // Dropped onto a cart: places the dragged gem there, swapping back
  // whatever already occupied that cart (to the palette if it came from
  // there, or into the vacated cart if it came from another one). Dropped
  // onto the palette tray: only meaningful for a cart-sourced drag, and
  // just returns that gem. Dropped anywhere else: no-op, the card snaps
  // back to where it started since nothing was mutated mid-drag.
  //
  // The drop target is resolved fresh from the release point here, not
  // read from the `hoverTarget` state — a short/fast drag (e.g. between
  // two adjacent carts) can release before the browser ever delivers a
  // pointermove event (they're throttled/coalesced), which would leave
  // hoverTarget stuck at its initial null and silently cancel every such
  // drop.
  const handleDragEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag) return;
      const { source } = drag;
      const target = resolveDropTarget(e.clientX, e.clientY);
      setDrag(null);
      setHoverTarget(null);

      if (target?.type === "slot") {
        const targetIndex = target.index;
        if (source.kind === "slot" && source.index === targetIndex) return;
        const occupying = slots[targetIndex];
        setSlots((prev) => {
          const next = [...prev];
          if (source.kind === "slot") next[source.index] = occupying ?? null;
          next[targetIndex] = source.gem;
          return next;
        });
        if (source.kind === "palette") {
          setPalette((prev) => {
            const rest = prev.filter((g) => g !== source.gem);
            return occupying ? [...rest, occupying] : rest;
          });
        }
        // Tutorial goal — once every cart is loaded (any order), the
        // gesture is learned; hand off to the real Round 1. Compute the
        // post-drop fill state here rather than reading the not-yet-
        // committed setSlots result.
        if (screen === "tutorial") {
          const nextSlots = [...slots];
          if (source.kind === "slot") nextSlots[source.index] = occupying ?? null;
          nextSlots[targetIndex] = source.gem;
          if (nextSlots.every((s) => s != null)) {
            setTimeout(beginRealRound, TUTORIAL_HOLD_MS);
          }
        }
      } else if (target?.type === "palette" && source.kind === "slot") {
        setSlots((prev) => {
          const next = [...prev];
          next[source.index] = null;
          return next;
        });
        setPalette((prev) => [...prev, source.gem]);
      }
    },
    [drag, slots, screen, beginRealRound]
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
  } else if (screen === "tutorial") {
    const allPlaced = slots.length > 0 && slots.every((s) => s != null);
    screenContent = (
      <>
        <YardBackdrop />
        <div style={playingWrapStyle}>
          <div style={headerRowStyle}>
            <button type="button" className="tap-scale" onClick={handleExit} style={exitButtonStyle} aria-label="Exit game">
              ✕
            </button>
            <div style={roundCounterStyle}>Trial Round</div>
            <div style={{ width: 34 }} aria-hidden />
          </div>

          <div style={tutorialBubbleStyle}>
            {allPlaced ? "Perfect! That's how you load the carts. Here we go!" : "Drag each glowing gem down into a cart to load it."}
            <div style={narrationBubbleTailStyle} />
          </div>
        </div>

        {/* Same palette dropzone + CartTrack the real rounds use, just a
            single gem and single cart — so the gesture learned here is
            exactly the one the game needs. */}
        <div
          data-palette-dropzone
          style={{
            ...paletteRowStyle,
            boxShadow: hoverTarget?.type === "palette" ? "inset 0 0 0 2px rgba(240,197,114,0.75)" : "none",
            borderRadius: 16,
            transition: "box-shadow 120ms ease",
          }}
        >
          {palette.map((gem, i) => (
            <div key={`${gem}-${i}`} style={{ position: "relative" }}>
              {/* a pulsing ring on every still-waiting gem, plus a single
                  bobbing hand on the first one, matching the reference's
                  guided-drag hint without cluttering all three */}
              {!drag && <div aria-hidden style={tutorialPulseStyle} />}
              <GemCard
                gem={gem}
                draggable
                dimmed={drag?.source.kind === "palette" && drag.source.gem === gem}
                onPointerDown={(e) => beginDrag({ kind: "palette", gem }, e)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
              />
              {!drag && i === 0 && <div aria-hidden style={tutorialHandStyle}>👆</div>}
            </div>
          ))}
        </div>

        <CartTrack
          slots={slots}
          interactive
          shake={false}
          draggingIndex={drag?.source.kind === "slot" ? drag.source.index : null}
          hoverIndex={hoverTarget?.type === "slot" ? hoverTarget.index : null}
          onGemPointerDown={(index, gem, e) => beginDrag({ kind: "slot", index, gem }, e)}
          onDragPointerMove={handleDragMove}
          onDragPointerUp={handleDragEnd}
        />
      </>
    );
  } else if (screen === "playing" && currentRound) {
    screenContent = (
      <>
        <YardBackdrop />
        <div style={playingWrapStyle}>
          <div style={headerRowStyle}>
            <button type="button" className="tap-scale" onClick={handleExit} style={exitButtonStyle} aria-label="Exit game">
              ✕
            </button>
            <div style={roundCounterStyle}>
              Round {currentRound.roundNumber} of {rounds.length}
            </div>
            <div style={{ width: 34 }} aria-hidden />
          </div>

          <ClueList rules={currentRound.rules} />
        </div>

        {/* Pulled out of playingWrapStyle's normal flow and pinned to the
            open dirt patch in the background art (between the track
            switches and the buffer stops — the one spot with no rails
            running through it), instead of sitting right under the
            clues. */}
        <div
          data-palette-dropzone
          style={{
            ...paletteRowStyle,
            boxShadow: hoverTarget?.type === "palette" ? "inset 0 0 0 2px rgba(240,197,114,0.75)" : "none",
            borderRadius: 16,
            transition: "box-shadow 120ms ease",
          }}
        >
          {palette.map((gem, i) => (
            <GemCard
              key={`${gem}-${i}`}
              gem={gem}
              draggable={!success}
              dimmed={drag?.source.kind === "palette" && drag.source.gem === gem}
              onPointerDown={(e) => beginDrag({ kind: "palette", gem }, e)}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
            />
          ))}
        </div>

        {/* Pinned to the painted tracks in the background art, not the
            document flow above — see CartTrack's own notes on why. */}
        <CartTrack
          slots={slots}
          interactive={!success}
          shake={shakeKey > 0}
          draggingIndex={drag?.source.kind === "slot" ? drag.source.index : null}
          hoverIndex={hoverTarget?.type === "slot" ? hoverTarget.index : null}
          onGemPointerDown={(index, gem, e) => beginDrag({ kind: "slot", index, gem }, e)}
          onDragPointerMove={handleDragMove}
          onDragPointerUp={handleDragEnd}
        />

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
      {/* The actual dragged card — fixed to the viewport (no transformed
          ancestor sits between here and the page) so it tracks the
          pointer exactly regardless of where in the layout it started. */}
      {drag && (
        <div aria-hidden style={{ ...dragGhostStyle, left: drag.x, top: drag.y }}>
          <GemCard gem={drag.source.gem} size={74} draggable={false} />
        </div>
      )}
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
        <GameTitleBanner title="Switch Yard Rescue" />
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
  top: 0,
  left: 0,
  right: 0,
  display: "flex",
  flexDirection: "column",
  paddingTop: SAFE_AREA_TOP + 8,
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
  position: "absolute",
  // Centered on the open dirt patch in the background art (image-space
  // y ≈ 56-63%, between the track switches above and the buffer stops
  // CartTrack pins to at y=75% below) — the one area with no rails
  // running through it.
  top: "55.5%",
  left: 16,
  right: 16,
  transform: "translateY(-50%)",
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "center",
  // With no gems left (every slot filled), this row would otherwise
  // collapse to 0 height — exactly when a drag-a-gem-back-to-the-palette
  // gesture is most likely, and a 0-height element can never be the
  // target elementFromPoint resolves to. Keep it tall enough to stay a
  // real drop target even empty.
  minHeight: 68,
};

// Fumi's coaching line for the tutorial — same bubble look as the
// region-intro narration, sitting just under the header.
const tutorialBubbleStyle: React.CSSProperties = {
  position: "relative",
  background: "rgba(246,245,255,0.97)",
  color: "var(--color-ink)",
  borderRadius: 18,
  padding: "14px 16px",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.45,
  textAlign: "center",
  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  marginTop: 8,
};

// A soft pulsing halo behind the one gem the player must drag — the main
// "grab this" signal.
const tutorialPulseStyle: React.CSSProperties = {
  position: "absolute",
  inset: -10,
  borderRadius: 18,
  border: "3px solid rgba(240,197,114,0.9)",
  boxShadow: "0 0 18px rgba(240,197,114,0.7)",
  animation: "glow-pulse 1.3s ease-in-out infinite",
  pointerEvents: "none",
};

// The bobbing pointer-finger hint, nudged just below the gem.
const tutorialHandStyle: React.CSSProperties = {
  position: "absolute",
  left: "72%",
  top: "78%",
  fontSize: 30,
  pointerEvents: "none",
  animation: "float-y 1.1s ease-in-out infinite",
  filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.5))",
};

const sendButtonStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 16,
  left: 16,
  right: 16,
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
