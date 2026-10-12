"use client";

import { useId, useRef, useState } from "react";
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const PANEL_ASPECT_RATIO_FALLBACK = 1.5;
// Visible gap between the two panels — big enough to read as "two separate
// photos stacked up", not a seam down the middle of one continuous image.
const GAP = 14;

// A handful of authored differences sit close enough to the crop's edge
// (see sceneLibrary.ts's crop notes) that their found-marker ring would
// otherwise extend past the panel's own box and get sliced off by its
// overflow:hidden — e.g. scene-1's squirrel-color lost nearly a third of
// its circle off the bottom. Keeping a little breathing room past the
// true edge so even a dead-center difference's ring doesn't sit flush
// against the panel border.
const MARKER_EDGE_PADDING = 4;

// The "The Mist Copy" badge (panelBadgeStyle, top:8/left:8) sits in its
// own top-left corner, above the markers in z-order — measured footprint
// is ~89x22 at (10,10), so a marker pushed up against the top edge by the
// clamp above can land directly underneath it. Reserve a little more than
// that footprint so an edge-clamped marker never has to render hidden
// behind the badge instead of just being cut off by the panel edge.
const BADGE_SAFE_ZONE = { right: 106, bottom: 38 };

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
    // a difference's radiusPct (authored once, in image-percent space) ->
    // on-screen pixel radii — elliptical, not circular, since x% and y%
    // are percentages of different dimensions (width vs height). This is
    // what lets the found-marker hug the actual tolerance zone instead of
    // a fixed guessed size.
    toBoxRadiusPx(radiusPct: number) {
      return {
        rx: (radiusPct / 100) * scaledW,
        ry: (radiusPct / 100) * scaledH,
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
            const { rx, ry } = transform.toBoxRadiusPx(Math.max(d.radiusPct, minTargetRadiusPct));
            // Clamped in real pixels (not percent) so the ring's full
            // extent — center ± radius — always lands inside the panel,
            // nudging the center in from the edge rather than letting the
            // circle itself get cropped.
            const boxX = clamp((pos.xPct / 100) * width, rx + MARKER_EDGE_PADDING, width - rx - MARKER_EDGE_PADDING);
            let boxY = clamp((pos.yPct / 100) * height, ry + MARKER_EDGE_PADDING, height - ry - MARKER_EDGE_PADDING);
            // An edge-clamped marker that lands under the badge (rather
            // than just near the true top edge) would render hidden behind
            // it instead of visibly cropped — push it below the badge
            // instead, re-clamped so that doesn't itself push past the
            // bottom edge for a very short panel.
            if (boxX - rx < BADGE_SAFE_ZONE.right && boxY - ry < BADGE_SAFE_ZONE.bottom) {
              boxY = clamp(BADGE_SAFE_ZONE.bottom + ry + MARKER_EDGE_PADDING, ry + MARKER_EDGE_PADDING, height - ry - MARKER_EDGE_PADDING);
            }
            return (
              <div
                key={d.id}
                aria-hidden
                style={{
                  position: "absolute",
                  left: boxX,
                  top: boxY,
                  width: 0,
                  height: 0,
                }}
              >
                <FoundMarker rx={rx} ry={ry} />
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

// A healed rune-seal, not a flat colored blob — a soft emerald glow (the
// Mist's corruption clearing) inside a dashed gold ring (matching the
// carved-gold framing used everywhere else in the app), sized per-axis to
// the actual difference's tolerance zone so it hugs the real object
// rather than a fixed guessed size. A few small sparkles sell the "magic"
// of the repair.
function FoundMarker({ rx, ry }: { rx: number; ry: number }) {
  const w = rx * 2;
  const h = ry * 2;
  const uid = useId();
  const gradId = `found-glow-${uid}`;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 100"
      style={{ position: "absolute", left: -rx, top: -ry, overflow: "visible", animation: "found-seal-in 420ms var(--ease-pop) both" }}
      aria-hidden
    >
      <defs>
        <radialGradient id={gradId}>
          <stop offset="0%" stopColor="rgba(190,255,215,0.85)" />
          <stop offset="55%" stopColor="rgba(61,220,132,0.4)" />
          <stop offset="100%" stopColor="rgba(61,220,132,0)" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${gradId})`} />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#F0C572" strokeWidth="3" strokeDasharray="7 5" opacity="0.9" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#FFF6E0" strokeWidth="1" opacity="0.5" />
      {[20, 140, 260].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const sx = 50 + Math.cos(rad) * 44;
        const sy = 50 + Math.sin(rad) * 44;
        return <circle key={deg} cx={sx} cy={sy} r="3" fill="#FFF6E0" opacity="0.9" style={{ animation: `twinkle 1.8s ease-in-out ${deg / 100}s infinite` }} />;
      })}
    </svg>
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
  // Solid, not translucent — a semi-transparent border here washes out to
  // a near-white line wherever it crosses bright parts of the photo
  // underneath (sky, water), instead of reading as gold.
  border: "2px solid #B8863C",
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
