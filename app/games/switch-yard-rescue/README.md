# Switch Yard Rescue

Game 4 of FUMI. A Lumosity "Organic Ordering"-style logic puzzle: each
round gives a set of energy-gem cards and a list of clue sentences (e.g.
"River comes 2nd.", "Sunstone comes immediately after Moss.", "If Amethyst
is before Sunstone, River must be 2nd."). The child must work out the one
order that satisfies every clue and load the gem carts in that order to
restart the power station. Deductive/logical reasoning, constraint
satisfaction, working memory.

Copies the shape of [`pathfinder-sweep`](../pathfinder-sweep/README.md) —
see [Adding a new game](../../../README.md#adding-a-new-game) in the
project root README for the checklist.

## Status: real round data, placeholder art

`engine/roundLibrary.ts` has 10 real, hand-verified rounds transcribed
directly from the design spec spreadsheet (Round / Cards / Rules / Correct
order columns) — nothing fabricated. Each round's `correctOrder` is the
spec's own answer key, hand-checked against that round's own rules before
being committed here; the win-check is a direct comparison against it,
not a rule-parsing/solver engine (the `rules` strings are shown to the
child verbatim and otherwise unused by the game logic).

The **visual assets are placeholders**: `components/GemCard.tsx` draws a
simple code-drawn faceted-gem glyph per color instead of real gem-icon
art, and `components/YardBackdrop.tsx` draws a simple gradient + rail-line
backdrop instead of the real painted switch-yard scene. Both reference
images (a 9-icon gem/state sheet, and a painted mine/power-station
background) were shared inline in chat but weren't accessible as files on
disk, unlike Decoy Grove's scene art — so this game shipped with
placeholders rather than blocking on that. To swap in the real art once
the files are available on disk:

1. Gem icons: replace `GemGlyph` in `components/GemCard.tsx` with real
   per-gem image assets (or keep the glyph but recolor/restyle it to match
   the real icon sheet's look).
2. Background: drop the painted scene under
   `public/games/switch-yard-rescue/backgrounds/`, and swap
   `YardBackdrop.tsx`'s code-drawn gradient for an `<img>`, following
   Gatekeeper's `GateBackdrop.tsx` as the pattern (object-fit: cover +
   measured crop math if the art doesn't match the device aspect ratio).

## Structure

```
switch-yard-rescue/
  SwitchYardRescueGame.tsx   Orchestrator: owns screen/game state, composes everything below
  types.ts                    All shared TypeScript contracts for this game
  config.ts                    Tunable data only — gem color theme, timings, copy
  index.ts                      Public barrel — this is the only path other code should import from
  engine/                       Pure game logic, no React, no DOM
    rng.ts                        Seeded PRNG (copied from the other games) — shuffles each round's palette
    roundLibrary.ts                The authored round data — see "Status" above
    sessionPlanner.ts              Builds the round sequence + per-round palette shuffle
    metrics.ts                     Turns raw round results into the end-of-game outcome/star rating
  components/
    GemCard.tsx                  One tappable gem (palette or placed-in-cart)
    CartTrack.tsx                 The row of cart slots being loaded
    ClueList.tsx                  The read-only clue/rules plate
    YardBackdrop.tsx              PLACEHOLDER background — see "Status"
  lib/
    sessionReporter.ts           The one seam a backend integration replaces later
```

## Game rule

Tap gem cards from the palette to load them into the cart slots, in the
order you think is correct based on the round's clues. Tap a loaded cart
to send that gem back to the palette (undo). Once every slot is filled,
"Send Carts" checks the order: correct and the power station lights up and
the next round opens; wrong and the carts shake — rearrange and try again,
no limit on attempts (per-round `attempts` count feeds the star rating,
same forgiving curve as every other FUMI mini-game: solving still rates 1
star minimum).

## Importing this game elsewhere

```ts
import { SwitchYardRescueGame } from "@/app/games/switch-yard-rescue";
```

Only `index.ts`'s exports are the supported public surface
(`SwitchYardRescueGame`, `SwitchYardRescueGameProps`, and the result
types). Nothing inside `engine/`, `components/`, or `lib/` is meant to be
imported directly from outside this folder.

## Backend integration point

`lib/sessionReporter.ts`'s `reportGame(outcome: GameOutcome)` is called
once per completed playthrough. It currently writes to `localStorage`;
swapping in a real API call is the only change needed to wire this game
into a backend.
