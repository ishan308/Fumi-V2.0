# Signal Watch

Game 5 of FUMI, part of the "River Relay" questline. A number-sense/mental
math puzzle: each round gives three energy-signal types (Leaf, Wave, Sun)
with a per-round unit value, and a target total. The child must pick a
count of each signal — via +/- steppers, no fixed combination forced on
them — so that `leafCount*leafValue + waveCount*waveValue + sunCount*sunValue`
lands exactly on the target, then send the energy to restore the river and
move to the next round. Arithmetic fluency, number composition, trial-and-
adjust reasoning.

Copies the shape of [`switch-yard-rescue`](../switch-yard-rescue/README.md)
— see [Adding a new game](../../../README.md#adding-a-new-game) in the
project root README for the checklist.

## Status: real round data, placeholder art

`engine/roundLibrary.ts` has 10 real, hand-verified rounds transcribed
directly from the design spec spreadsheet (Round / Leaf value / Wave
value / Sun value / Total energy columns). The spreadsheet's own
"Solution" column (one example combination per round) isn't carried into
the data — it was only used to hand-verify each round's target is
actually reachable before authoring it here (see the comment at the top
of `roundLibrary.ts` for the full working). The win-check is a live sum
against the target, not a match against that one example combination,
since a sum-to-target puzzle like this one usually has more than one
valid answer.

The **visual assets are placeholders**: `components/SignalCounter.tsx`
draws a simple code-drawn icon (leaf / spiral-wave / sun) plus a CSS
"flowing energy" effect instead of the real painted waterfall-fountain
art from the reference mock, and the backdrop is the shared `Ambient`
component instead of a real painted river-at-night scene. The reference
mock's layout and copy (title treatment, "Total Energy Needed" / "Signal
Values" cards, the mission-node progress tracker, "Send Energy" CTA) were
followed closely; only the specific numbers shown in that mock are a
generic illustration, not real round data. To swap in real art once files
are available on disk, follow Switch Yard Rescue's own placeholder-art
section as the pattern.

## Structure

```
signal-watch/
  SignalWatchGame.tsx         Orchestrator: owns screen/game state, composes everything below
  types.ts                     All shared TypeScript contracts for this game
  config.ts                     Tunable data only — signal color theme, timings, copy
  index.ts                       Public barrel — this is the only path other code should import from
  engine/                        Pure game logic, no React, no DOM
    roundLibrary.ts                 The authored round data — see "Status" above
    sessionPlanner.ts               Builds the round sequence (fixed order — no shuffling needed here)
    metrics.ts                      Turns raw round results into the end-of-game outcome/star rating
  components/
    SignalCounter.tsx              One signal's fountain + value + -/+ stepper
    EnergyMeter.tsx                 The running "Energy Loaded X / target" readout
    ProgressTrack.tsx               The chain-of-nodes round tracker from the reference mock
  lib/
    sessionReporter.ts             The one seam a backend integration replaces later
```

## Game rule

Use the +/- steppers under each signal to build up a total that exactly
matches "Total Energy Needed" for the round, using that round's own
per-signal values (they change every round). Any combination of counts
that sums to the exact target works — there's no single forced answer.
Press "Send Energy": matches exactly and the river lights up and the next
round opens; doesn't match and the counters shake — keep adjusting, no
limit on attempts (per-round `attempts` count feeds the star rating, same
forgiving curve as every other FUMI mini-game: solving still rates 1 star
minimum). The pause button opens a simple resume/exit overlay; it doesn't
pause a clock since this game has none.

## Importing this game elsewhere

```ts
import { SignalWatchGame } from "@/app/games/signal-watch";
```

Only `index.ts`'s exports are the supported public surface
(`SignalWatchGame`, `SignalWatchGameProps`, and the result types). Nothing
inside `engine/`, `components/`, or `lib/` is meant to be imported
directly from outside this folder.

## Backend integration point

`lib/sessionReporter.ts`'s `reportGame(outcome: GameOutcome)` is called
both when a playthrough finishes (`status: "completed"`) and when the
player exits mid-session (`status: "exited"`, with whatever rounds were
actually solved by then). It currently writes to `localStorage`; swapping
in a real API call is the only change needed to wire this game into a
backend.
