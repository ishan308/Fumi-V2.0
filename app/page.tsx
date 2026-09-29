"use client";

import { useState } from "react";
import { PathfinderSweepGame } from "./games/pathfinder-sweep/PathfinderSweepGame";
import { PLAY_AREA } from "./games/pathfinder-sweep/config";
import { PhoneFrame } from "./components/PhoneFrame";

export default function Home() {
  // Remounting on exit (rather than returning to a landing screen, since
  // there isn't one) gives a clean fresh session each time.
  const [resetCount, setResetCount] = useState(0);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at 50% 0%, #1c1740 0%, #07061c 55%, #030209 100%)",
        backgroundColor: "#030209",
      }}
    >
      <PhoneFrame>
        <div style={{ position: "relative", width: PLAY_AREA.width, height: PLAY_AREA.height, overflow: "hidden" }}>
          <PathfinderSweepGame key={resetCount} ageBand="6-10" onExit={() => setResetCount((c) => c + 1)} />
        </div>
      </PhoneFrame>
    </main>
  );
}
