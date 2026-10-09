"use client";

import { useRef, useState } from "react";
import type { ScenePlan } from "../types";

type Ripple = { id: number; xPct: number; yPct: number };

type SceneDuoProps = {
  scene: ScenePlan;
  foundIds: Set<string>;
  minTargetRadiusPct: number;
  interactive: boolean;
  // true once every difference is found — cross-fades the copy panel into
  // the intact image, per the spec's "repaired scene dissolves into the
  // true Greenwood scene" beat.
  repairing: boolean;
  onDifferenceFound: (differenceId: string) => void;
  onIncorrectTap: () => void;
  // Exact box each panel fills — edge-to-edge, immersive. Unlike an
  // earlier version of this component, this does NOT preserve the scene's
  // aspect ratio: if the box's ratio doesn't match the image's own, the
  // image is cropped (object-fit: cover) to fill it completely. Every
  // authored difference must therefore fall within whatever band survives
  // the crop — see sceneLibrary.ts's note on scene-1 for which differences
  // were removed for exactly this reason.
  width: number;
  height: number;
};

const PANEL_ASPECT_RATIO_FALLBACK = 1.5;
// Visible gap between the two panels — big enough to read as "two separate
// photos stacked up", not a seam down the middle of one continuous image.
const GAP = 14;

// Maps between "percent of the full source image" (what difference
// coordinates are authored in) and "percent of the rendered, possibly
// cropped panel" (what a click/marker position actually is on screen) —
// the same cover-crop math used to calibrate Gatekeeper's gate circle
// against its background art. Treats the image as having a normalized
// width of `aspectRatio` and height of `1`, since only the ratio matters.
function coverCropTransform(boxWidth: number, boxHeight: number, aspectRatio: number) {
  const imgW = aspectRatio;
  const imgH = 1;
  const scale = Math.max(boxWidth / imgW, boxHeight / imgH);
  const scaledW = imgW * scale;
  const scaledH = imgH * scale;
  const offsetX = (scaledW - boxWidth) / 2;
  const offsetY = (scaledH - boxHeight) / 2;

  return {
    // box-relative pixel -> native image percent (for hit-testing a tap)
    toImagePct(boxX: number, boxY: number) {
      return {
        xPct: (((boxX + offsetX) / scale) / imgW) * 100,
        yPct: (((boxY + offsetY) / scale) / imgH) * 100,
      };
    },
    // native image percent -> box-relative percent (for positioning a
    // found-marker authored in image space)
    toBoxPct(imageXPct: number, imageYPct: number) {
      const nativeX = (imageXPct / 100) * imgW;
      const nativeY = (imageYPct / 100) * imgH;
      return {
        xPct: ((nativeX * scale - offsetX) / boxWidth) * 100,
        yPct: ((nativeY * scale - offsetY) / boxHeight) * 100,
      };
    },
  };
}

// Two matched illustrations stacked vertically, each filling its box
// edge-to-edge — the intact scene (top, purely reference, never tappable)
// and the Mist copy (bottom, where every tap is hit-tested against the
// scene's authored differences). Differences are authored as a percentage
// of the full source image; coverCropTransform converts between that and
// on-screen box percentages so hit-testing and marker placement stay exact
// even though the panel crops the image to fill its box completely.
export function SceneDuo({
  scene,
  foundIds,
  minTargetRadiusPct,
  interactive,
  repairing,
  onDifferenceFound,
  onIncorrectTap,
  width,
  height,
}: SceneDuoProps) {
  const [ripple, setRipple] = useState<Ripple | null>(null);
  const rippleIdRef = useRef(0);
  const aspectRatio = scene.aspectRatio ?? PANEL_ASPECT_RATIO_FALLBACK;
  const transform = coverCropTransform(width, height, aspectRatio);

  const handleCopyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || repairing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const boxX = e.clientX - rect.left;
    const boxY = e.clientY - rect.top;
    const { xPct, yPct } = transform.toImagePct(boxX, boxY);

    const hit = scene.differences.find((d) => {
      if (foundIds.has(d.id)) return false;
      const r = Math.max(d.radiusPct, minTargetRadiusPct);
      const dx = xPct - d.xPct;
      const dy = yPct - d.yPct;
      return Math.sqrt(dx * dx + dy * dy) <= r;
    });

    if (hit) {
      onDifferenceFound(hit.id);
      return;
    }

    rippleIdRef.current += 1;
    const id = rippleIdRef.current;
    // Ripple is purely visual click-feedback — rendered at the raw
    // box-relative tap position, not run through the image transform.
    setRipple({ id, xPct: (boxX / width) * 100, yPct: (boxY / height) * 100 });
    onIncorrectTap();
    setTimeout(() => {
      setRipple((current) => (current?.id === id ? null : current));
    }, 520);
  };

  return (
    <div style={duoWrapperStyle}>
      <div style={{ ...panelFrameStyle, width, height }}>
        <div style={panelBadgeStyle}>The Grove</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={scene.intactSrc} alt="" style={panelImageStyle} draggable={false} />
      </div>

      <div style={{ height: GAP }} aria-hidden />

      <div
        style={{ ...panelFrameStyle, width, height, cursor: interactive && !repairing ? "crosshair" : "default" }}
        onClick={handleCopyClick}
      >
        <div style={panelBadgeStyle}>The Mist Copy</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={scene.copySrc} alt="" style={panelImageStyle} draggable={false} />

        {/* the repair cross-fade — the true scene rises up out of the Mist
            copy once every difference is found */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={scene.intactSrc}
          alt=""
          style={{
            ...panelImageStyle,
            position: "absolute",
            inset: 0,
            opacity: repairing ? 1 : 0,
            transition: "opacity 650ms ease",
          }}
          draggable={false}
        />

        {scene.differences
          .filter((d) => foundIds.has(d.id))
          .map((d) => {
            const pos = transform.toBoxPct(d.xPct, d.yPct);
            return (
              <div
                key={d.id}
                aria-hidden
                style={{
                  position: "absolute",
                  left: `${pos.xPct}%`,
                  top: `${pos.yPct}%`,
                  width: 0,
                  height: 0,
                }}
              >
                <div style={foundMarkerStyle} />
              </div>
            );
          })}

        {ripple && (
          <div
            key={ripple.id}
            aria-hidden
            style={{
              position: "absolute",
              left: `${ripple.xPct}%`,
              top: `${ripple.yPct}%`,
              width: 0,
              height: 0,
            }}
          >
            <div style={rippleStyle} />
          </div>
        )}
      </div>
    </div>
  );
}

const duoWrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

// Card styling (rounded corners, border, shadow) so each panel reads as
// its own distinct photo, not one continuous image sliced in half.
const panelFrameStyle: React.CSSProperties = {
  position: "relative",
  borderRadius: 16,
  overflow: "hidden",
  border: "1px solid rgba(240,166,60,0.4)",
  boxShadow: "0 8px 18px rgba(0,0,0,0.45)",
  background: "#0a0a14",
};

// Small overlay badge instead of a separate label row — orientation
// without spending any of the already-tight vertical budget on it.
const panelBadgeStyle: React.CSSProperties = {
  position: "absolute",
  top: 8,
  left: 8,
  zIndex: 2,
  padding: "3px 9px",
  borderRadius: 999,
  background: "rgba(10,8,20,0.72)",
  border: "1px solid rgba(240,166,60,0.4)",
  color: "var(--color-lavender)",
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: 0.3,
};

const panelImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  userSelect: "none",
};

// Repaired-area glow — a soft green-gold burst marking a found difference,
// left in place for the rest of the scene as visible proof of progress.
const foundMarkerStyle: React.CSSProperties = {
  position: "absolute",
  left: -16,
  top: -16,
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(168,255,200,0.85), rgba(61,220,132,0.35) 55%, transparent 75%)",
  border: "1.5px solid rgba(168,255,200,0.8)",
  animation: "bubble-pop 320ms var(--ease-pop) both",
};

// A neutral (not red/punishing) ripple — per spec, a wrong-area tap is
// logged but never reads as a mistake the way Gatekeeper's commission
// error does; this is just "not it, keep looking".
const rippleStyle: React.CSSProperties = {
  position: "absolute",
  left: -20,
  top: -20,
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "2px solid rgba(228,222,252,0.85)",
  animation: "neutral-ripple 520ms ease-out forwards",
};
