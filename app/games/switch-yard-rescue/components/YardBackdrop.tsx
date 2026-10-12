"use client";

// The real painted switch-yard scene — a mine entrance, rail junction, and
// the crystal-powered station carts load into. Source art is 900x1600
// (0.5625 ratio), close enough to the 390x700 (0.557) play area that
// object-fit: cover crops almost nothing.
export function YardBackdrop() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/games/switch-yard-rescue/backgrounds/yard.jpeg"
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}
