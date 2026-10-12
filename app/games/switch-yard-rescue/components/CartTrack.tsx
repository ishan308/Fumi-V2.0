"use client";

import type { GemType } from "../types";
import { GemCard } from "./GemCard";

type CartTrackProps = {
  slots: (GemType | null)[];
  interactive: boolean;
  shake: boolean;
  // Index of the slot currently being dragged out of (hidden in place —
  // the floating ghost rendered by SwitchYardRescueGame stands in for it).
  draggingIndex: number | null;
  // Index of the slot the drag is currently hovered over, for the
  // drop-target glow; null when nothing is being dragged or the pointer
  // is elsewhere.
  hoverIndex: number | null;
  onGemPointerDown: (index: number, gem: GemType, e: React.PointerEvent<HTMLDivElement>) => void;
  onDragPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  size?: number;
};

// Source art (public/games/switch-yard-rescue/cart.png) is 400x334.
const CART_ASPECT_RATIO = 400 / 334;

// Pixel-measured against the five painted buffer stops in
// backgrounds/yard.jpeg (buffers sit at image-space x ≈ 10/30/50/70/90%,
// y ≈ 75%). Since YardBackdrop's 900x1600 art crops to the 390x700 play
// area almost exactly (see its own comment), image-space percent and
// on-screen percent are close enough to treat as the same number here —
// no crop-transform math needed. Each round count picks a subset/spread
// of those same slots so carts always land on a painted track, not the
// dirt between them; 6-card rounds (more lanes than the art has) fall
// back to an even spread across the same band.
const TRACK_Y_PCT = 75;
const TRACK_X_PCT_BY_COUNT: Record<number, number[]> = {
  1: [50],
  2: [30, 70],
  3: [30, 50, 70],
  4: [10, 30, 70, 90],
  5: [10, 30, 50, 70, 90],
};

function trackXPositions(count: number): number[] {
  const preset = TRACK_X_PCT_BY_COUNT[count];
  if (preset) return preset;
  if (count <= 1) return [50];
  const span = 80;
  return Array.from({ length: count }, (_, i) => 10 + (span / (count - 1)) * i);
}

// The cart art itself is only ~74px wide with just a few px between
// neighbors, which is too precise a drop target for a real finger —
// missing by a little lands on the background and the drop silently
// fails. Each slot's actual hit zone instead spans the full midpoint-to-
// midpoint gap to its neighbors (and all the way to the screen edge for
// the two end slots), so the whole track row is tiled edge-to-edge with
// no dead zones: any drop anywhere along it resolves to the nearest cart.
function hitZoneBounds(xPositions: number[]): { left: number; width: number }[] {
  return xPositions.map((x, i) => {
    const left = i === 0 ? 0 : (xPositions[i - 1] + x) / 2;
    const right = i === xPositions.length - 1 ? 100 : (x + xPositions[i + 1]) / 2;
    return { left, width: right - left };
  });
}

// How far above/below the track row each slot's hit zone reaches — well
// clear of the label above and the Send Carts button below, but forgiving
// enough that a slightly-high or slightly-low drop still registers.
const HIT_ZONE_HEIGHT = 130;

// The row of real mine carts waiting at the power station — pinned to the
// painted tracks in the background art rather than floating in the UI
// flow. An empty cart sits on each track until a gem is dragged into it;
// dragging a loaded cart's gem elsewhere moves or swaps it (see
// SwitchYardRescueGame's drag orchestration) — carts themselves are
// drop targets, identified for hit-testing via data-slot-index.
export function CartTrack({
  slots,
  interactive,
  shake,
  draggingIndex,
  hoverIndex,
  onGemPointerDown,
  onDragPointerMove,
  onDragPointerUp,
  size = 74,
}: CartTrackProps) {
  const cartHeight = size / CART_ASPECT_RATIO;
  const gemSize = size * 0.64;
  const xPositions = trackXPositions(slots.length);
  const hitZones = hitZoneBounds(xPositions);

  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: `${TRACK_Y_PCT}%`, height: 0 }}>
      {slots.map((gem, i) => {
        // The hit zone isn't centered on the cart's true track position —
        // it's bounded by the midpoints to each neighbor, which skew
        // toward whichever side has more room (e.g. the end slots, only
        // bounded by a neighbor on one side). Position the visual cart at
        // its real xPositions[i] by expressing that as a percent of this
        // zone's own width, not a flat 50% — otherwise the art drifts off
        // the painted track it was pixel-matched to.
        const zone = hitZones[i];
        const cartPctWithinZone = ((xPositions[i] - zone.left) / zone.width) * 100;
        return (
        <div
          key={i}
          data-slot-index={i}
          style={{
            position: "absolute",
            left: `${zone.left}%`,
            width: `${zone.width}%`,
            top: -HIT_ZONE_HEIGHT / 2,
            height: HIT_ZONE_HEIGHT,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: `${cartPctWithinZone}%`,
              top: "50%",
              width: size,
              height: cartHeight,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* a soft gold glow behind the cart while it's the live drop
                target — the main "which track am I over" signal */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(240,197,114,0.55), transparent 70%)",
                opacity: hoverIndex === i ? 1 : 0,
                transition: "opacity 120ms ease",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/games/switch-yard-rescue/cart.png"
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              draggable={false}
            />
            {gem && (
              <div style={{ position: "absolute", left: "50%", top: "32%", transform: "translate(-50%, -50%)" }}>
                <GemCard
                  gem={gem}
                  size={gemSize}
                  draggable={interactive}
                  dimmed={draggingIndex === i}
                  shake={shake}
                  onPointerDown={(e) => onGemPointerDown(i, gem, e)}
                  onPointerMove={onDragPointerMove}
                  onPointerUp={onDragPointerUp}
                  onPointerCancel={onDragPointerUp}
                />
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
