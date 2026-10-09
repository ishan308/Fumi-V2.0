# Decoy Grove

Game 3 of FUMI. A spot-the-difference task: two matched Greenwood scenes
appear side by side — the intact grove and the Mist's near-perfect copy —
and the child taps every detail the Mist got wrong. Selective visual
attention, visual discrimination, systematic scanning. Quest: Greenwood /
Fernhaven — "The Mirror Grove Trial", Part A.

Copies the shape of [`pathfinder-sweep`](../pathfinder-sweep/README.md) —
see [Adding a new game](../../../README.md#adding-a-new-game) in the
project root README for the checklist.

## Status: 1 real scene in, 2 more expected

`engine/sceneLibrary.ts` holds:

- `placeholder-1` — a hand-drawn SVG stand-in (`public/games/decoy-grove/scenes/placeholder-1-*.svg`),
  not real Mirror Grove illustration. Flagged `isTutorial: true` so it plays
  first, ungraded, as the walkthrough. Kept around for exactly that purpose
  — delete it once there's a real tutorial-weight scene to replace it with.
- `scene-1-enchanted-forest` — the first real scene ("image one"), split
  from an AI-illustrated side-by-side pair into
  `public/games/decoy-grove/scenes/scene-1-{intact,copy}.png`. All 15
  authored differences were found by diffing the two halves and manually
  confirming every candidate region (no answer key was provided), then
  verified by tapping each one in a live run and screenshotting that the
  found-marker lands on the actual object. Denser than the spec's 8-10
  "hardest" target — that's genuinely what the source image has.

To add another real scene once the next image pair arrives:

1. Drop the two images under `public/games/decoy-grove/scenes/`.
2. Add an entry to `SCENE_LIBRARY` in `engine/sceneLibrary.ts` with:
   - `intactSrc` / `copySrc` pointing at the new files
   - `aspectRatio` set to the source images' own width/height ratio (this
     is what keeps `SceneDuo`'s object-fit:cover from cropping, which is
     what keeps the percentage-space hotspot coordinates below exact)
   - `differences`: one entry per authored difference, each with
     `xPct`/`yPct` (hotspot center, 0–100, as a percentage of the **copy**
     image's own width/height) and `radiusPct` (tap tolerance)
3. Delete the placeholder entry once there's enough real content that
   losing it doesn't break the dev-testable loop.

## Structure

```
decoy-grove/
  DecoyGroveGame.tsx   Orchestrator: owns screen/game state, composes everything below
  types.ts              All shared TypeScript contracts for this game
  config.ts              Tunable data only — timings, difficulty, copy, layout constants
  index.ts                Public barrel — this is the only path other code should import from
  engine/                 Pure game logic, no React, no DOM
    rng.ts                  Seeded PRNG (copied from the other games; not yet used by this one)
    sceneLibrary.ts          The authored scene data — see "Status" above
    sessionPlanner.ts        Splits the library into tutorial + scored session
    metrics.ts               Turns raw scene results into the end-of-game outcome/star rating
  components/
    SceneDuo.tsx            The side-by-side compare widget — the one real interactive surface
  lib/
    sessionReporter.ts      The one seam a backend integration replaces later
```

## Game rule

"The Mist copied this place, but some details are wrong. Compare both
scenes and tap every difference you can find." No timer — the challenge is
density and subtlety, not speed (see `config.ts`'s
`DIFFERENCE_COUNT_PROGRESSION`: 4 → 5 → 6 → 7 → 8 → 9 across the 6 scored
scenes, matching the spec's recommended progression). A correct tap repairs
that spot permanently (small green glow, stays visible) and decrements the
counter; an incorrect tap gets a brief *neutral* ripple — logged for
accuracy metrics, never a penalty or an error-reads-as-mistake treatment
like Gatekeeper's commission flash. Once every difference in a scene is
found, the Mist copy cross-fades into the true scene and the next puzzle
opens. A hint button unlocks after `AGE_BAND_CONFIG[ageBand].hintAvailableAfterMs`
and reveals the next unfound difference's broad-area clue (never the exact
answer) through Fumi's dialogue.

## Importing this game elsewhere

```ts
import { DecoyGroveGame } from "@/app/games/decoy-grove";
```

Only `index.ts`'s exports are the supported public surface
(`DecoyGroveGame`, `DecoyGroveGameProps`, and the result types). Nothing
inside `engine/`, `components/`, or `lib/` is meant to be imported directly
from outside this folder.

## Backend integration point

`lib/sessionReporter.ts`'s `reportGame(outcome: GameOutcome)` is called
once per completed playthrough. It currently writes to `localStorage`;
swapping in a real API call is the only change needed to wire this game
into a backend.
