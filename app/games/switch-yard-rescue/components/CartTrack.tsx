"use client";

import type { GemType } from "../types";
import { GemCard } from "./GemCard";

type CartTrackProps = {
  slots: (GemType | null)[];
  interactive: boolean;
  shake: boolean;
  onRemove: (index: number) => void;
  size?: number;
};

// The row of empty carts waiting at the power station — tapping a filled
// slot sends that gem back to the palette (undo), same as tapping a
// placed gem card anywhere else in this game.
export function CartTrack({ slots, interactive, shake, onRemove, size = 56 }: CartTrackProps) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
      {slots.map((gem, i) =>
        gem ? (
          <GemCard key={i} gem={gem} size={size} interactive={interactive} onTap={() => onRemove(i)} shake={shake} />
        ) : (
          <div key={i} style={{ width: size, height: size, borderRadius: 14, border: "2px dashed rgba(240,166,60,0.35)", background: "rgba(10,8,20,0.5)" }} />
        )
      )}
    </div>
  );
}
