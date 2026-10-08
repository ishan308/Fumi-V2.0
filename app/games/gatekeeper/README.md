# Gatekeeper

Game 2 of FUMI. A Go/No-Go task: tap every clean rune that lights up the
gate console, but withhold on any rune the Mist has cracked. Sustained
attention, response inhibition, impulse control. Quest: Greenwood /
Fernhaven — "The Lost Trail", Part B.

Copies the shape of [`pathfinder-sweep`](../pathfinder-sweep/README.md) —
see [Adding a new game](../../../README.md#adding-a-new-game) in the
project root README for the checklist.

## Structure

```
gatekeeper/
  GatekeeperGame.tsx   Orchestrator: owns screen/game state, composes everything below
  types.ts              All shared TypeScript contracts for this game
  config.ts              Tunable data only — timings, difficulty ramps, copy, layout constants
  index.ts                Public barrel — this is the only path other code should import from
  engine/                 Pure game logic, no React, no DOM
    rng.ts                  Seeded PRNG — every trial is reproducible from its seed
    sessionPlanner.ts        Builds the 96-trial session (4 blocks) + 8 practice trials
    metrics.ts               Turns raw trial results into the end-of-game outcome/star rating
  components/            Presentational React components, game-specific
    GateRune.tsx, GatePowerMeter.tsx, GateBackdrop.tsx, ScreenCrack.tsx
  lib/
    sessionReporter.ts      The one seam a backend integration replaces later
```

The gate arch/circle is a single painted background image
(`public/games/gatekeeper/backgrounds/gate-portal.png`) whose center
circle is blank stone — the Go/No-Go symbol itself is drawn by us (see
`engine/symbolLibrary.ts`, copied from Pathfinder Sweep's symbol set) on
top of it, along with the rune's crack, the power meter, and every
feedback effect, all SVG/CSS. The mascot reuses the shared
`app/components/Fumi.tsx` (and `FumiPortrait.tsx` on the intro/tutorial
screens only — real gameplay has no mascot).

## Game rule

"Tap every clean rune. If the rune is cracked by Mist, do nothing and let
it pass." One rune at a time at the gate's center; a large tap zone covers
it. 76 clean (Go) / 20 corrupted (No-Go) trials across 4 blocks of 24.
Gate power is driven by cumulative *correct* Go-taps, not trial count —
25/50/75/100% land at 19/38/57/76 correct taps (see config.ts's
`GATE_POWER_CORRECT_THRESHOLDS`); errors don't advance the gate. Every
rune — Go or No-Go — auto-resolves on a fixed schedule by trial number,
same for both age bands (see config.ts's `RESPONSE_WINDOW_SCHEDULE`):
1150ms for runes 1-20, 900ms for 21-50, 750ms for 51-75, 600ms for 76-96.
An untapped Go times out as an omission; an untapped No-Go correctly
passes. Blocks still exist underneath for No-Go spacing and the Mist
crack's difficulty ramp (subtler from block 1 to block 4, per age band).

## Importing this game elsewhere

```ts
import { GatekeeperGame } from "@/app/games/gatekeeper";
```

Only `index.ts`'s exports are the supported public surface
(`GatekeeperGame`, `GatekeeperGameProps`, and the result types). Nothing
inside `engine/`, `components/`, or `lib/` is meant to be imported
directly from outside this folder.

## Backend integration point

`lib/sessionReporter.ts`'s `reportGame(outcome: GameOutcome)` is called
once per completed playthrough (96 scored trials; practice is not
scored). It currently writes to `localStorage`; swapping in a real API
call is the only change needed to wire this game into a backend.
