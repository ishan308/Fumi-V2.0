"use client";

import { useState } from "react";
import { PhoneFrame, PHONE_SCREEN_SIZE } from "./components/PhoneFrame";
import { DEV_GAME_REGISTRY } from "./games/registry";

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px 24px",
  background: "radial-gradient(circle at 50% 0%, #1c1740 0%, #07061c 55%, #030209 100%)",
  backgroundColor: "#030209",
};

// Dev-only game picker — not part of the shipped app. Each game is normally
// handed off/deployed on its own; this just gives developers one screen to
// launch any game locally. See app/games/registry.tsx to add a game.
function GamePicker({ onSelect }: { onSelect: (slug: string) => void }) {
  return (
    <div style={{ color: "var(--color-soft)", fontFamily: "var(--font-body), system-ui", textAlign: "center" }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>FUMI — Dev Game Picker</h1>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {DEV_GAME_REGISTRY.map((game) => (
          <li key={game.slug}>
            <button
              type="button"
              onClick={() => onSelect(game.slug)}
              style={{
                font: "inherit",
                fontSize: 18,
                color: "var(--color-gold)",
                background: "transparent",
                border: "1px solid rgba(240,166,60,0.4)",
                borderRadius: 12,
                padding: "10px 28px",
                cursor: "pointer",
              }}
            >
              {game.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  // Remounting on exit (rather than returning to a landing screen, since
  // there isn't one) gives a clean fresh session each time.
  const [resetCount, setResetCount] = useState(0);

  const activeGame = DEV_GAME_REGISTRY.find((g) => g.slug === activeSlug) ?? null;

  return (
    <main style={pageStyle}>
      {activeGame ? (
        <PhoneFrame>
          <div style={{ position: "relative", ...PHONE_SCREEN_SIZE, overflow: "hidden" }}>
            {activeGame.render(() => {
              setResetCount((c) => c + 1);
              setActiveSlug(null);
            })}
          </div>
        </PhoneFrame>
      ) : (
        <GamePicker key={resetCount} onSelect={setActiveSlug} />
      )}
    </main>
  );
}
