import type { ScenePlan } from "../types";

// No tutorial scene — the game goes straight into real scored scenes (see
// DecoyGroveGame's region-intro narration for the one-time "how to play"
// framing instead of a dedicated practice round). isTutorial stays in the
// type/engine plumbing in case a real guided-first-scene is wanted later;
// nothing in this library currently sets it.
export const SCENE_LIBRARY: ScenePlan[] = [

  // First real Mirror Grove scene ("image one") — an AI-illustrated
  // enchanted-forest pair. Authored by diffing the two halves of the
  // source image (Desktop/"Enchanted Forest Spot-the-Difference
  // Puzzle.png") pixel-by-pixel plus manual visual confirmation of every
  // candidate region. Both source PNGs were then cropped 8px off their
  // left edge to remove a leftover white divider strip from the original
  // side-by-side composite (only scene-1-copy.png actually had it, but
  // both sides were cropped equally to keep them pixel-aligned) — xPct
  // values below are relative to that final 760x1024 image
  // (xPct = x/760*100, yPct = y/1024*100), already adjusted for the crop.
  //
  // 12 of the 15 originally-confirmed differences are kept here. The panel
  // is displayed full-bleed (SceneDuo renders it edge-to-edge, cropped via
  // object-fit: cover rather than letterboxed) at a fixed box, which only
  // shows roughly native yPct 15-85 of this portrait source image — three
  // differences fell in the cropped-off top/bottom strips and were dropped
  // entirely rather than left in as permanently unreachable dead data:
  // "windmill-blades" (yPct 14.6), "window-glow" (yPct 4.4), and
  // "flower-color" (yPct 96.2). Re-add them if a future layout stops
  // cropping this scene's panels.
  {
    id: "scene-1-enchanted-forest",
    intactSrc: "/games/decoy-grove/scenes/scene-1-intact.png",
    copySrc: "/games/decoy-grove/scenes/scene-1-copy.png",
    aspectRatio: 760 / 1024,
    complexity: 2,
    isTutorial: false,
    differences: [
      {
        id: "deer-color",
        type: "internal-detail",
        xPct: 16.0,
        yPct: 28.3,
        radiusPct: 7,
        hint: "The deer on the cliff looks a little different today.",
      },
      {
        id: "bird-species",
        type: "internal-detail",
        xPct: 8.9,
        yPct: 38.6,
        radiusPct: 6,
        hint: "Check the bird perched on the wooden sign.",
      },
      {
        id: "butterfly-color",
        type: "internal-detail",
        xPct: 64.1,
        yPct: 34.7,
        radiusPct: 5,
        hint: "A butterfly is fluttering near the waterfall — look closely.",
      },
      {
        id: "banner-symbol",
        type: "internal-detail",
        xPct: 92.3,
        yPct: 36.1,
        radiusPct: 7,
        hint: "The banner hanging from the treehouse caught the Mist's touch.",
      },
      {
        id: "fence-vase",
        type: "internal-detail",
        xPct: 77.3,
        yPct: 51.8,
        radiusPct: 6,
        hint: "Something by the garden fence looks different.",
      },
      {
        id: "shelf-vase",
        type: "internal-detail",
        xPct: 87.8,
        yPct: 50.3,
        radiusPct: 5,
        hint: "Check the pottery on the treehouse shelf.",
      },
      {
        id: "large-urn",
        type: "internal-detail",
        xPct: 93.0,
        yPct: 48.8,
        radiusPct: 6,
        hint: "There's a big vase near the treehouse — does it match?",
      },
      {
        id: "shelf-emblem-jars",
        type: "internal-detail",
        xPct: 95.0,
        yPct: 56.2,
        radiusPct: 6,
        hint: "Look at the little shelf near the bridge.",
      },
      {
        id: "boat-mushroom",
        type: "added-object",
        xPct: 97.7,
        yPct: 81.5,
        radiusPct: 5,
        hint: "Peek inside the wooden boat.",
      },
      {
        id: "squirrel-color",
        type: "internal-detail",
        xPct: 17.3,
        yPct: 83.0,
        radiusPct: 7,
        hint: "The squirrel by the stump looks different.",
      },
      {
        id: "fish-color",
        type: "internal-detail",
        xPct: 60.8,
        yPct: 75.7,
        radiusPct: 7,
        hint: "Something's off with the fish in the pond.",
      },
      {
        id: "bridge-flag",
        type: "added-object",
        xPct: 49.6,
        yPct: 60.5,
        radiusPct: 5,
        hint: "Check the bridge railing carefully.",
      },
    ],
  },

  // Second real Mirror Grove scene ("image two" / "Pair 2: Ancient Ruins").
  // Source: Desktop/"Ancient Ruins_ Find 20 Differences.png" (1536x1024),
  // split into two 734x840 halves cropped inside the source's own
  // decorative border/header/footer chrome (that UI is baked into the
  // asset but duplicated by our own HUD, so it's cropped out entirely —
  // see the crop box in the commit that added this scene). 10 confirmed
  // differences found by manual region-by-region comparison; coordinates
  // are xPct = x/734*100, yPct = y/840*100. This aspect ratio (0.874) is
  // much closer to the panel box's own ratio than scene-1's was, so the
  // crop window is far more generous (~10-90% visible) and nothing had to
  // be dropped.
  {
    id: "scene-2-ancient-ruins",
    intactSrc: "/games/decoy-grove/scenes/scene-2-intact.png",
    copySrc: "/games/decoy-grove/scenes/scene-2-copy.png",
    aspectRatio: 734 / 840,
    complexity: 3,
    isTutorial: false,
    differences: [
      {
        id: "owl-missing",
        type: "missing-object",
        xPct: 19.8,
        yPct: 13.7,
        radiusPct: 7,
        hint: "Someone who used to perch on the left pillar is gone.",
      },
      {
        id: "banner-color",
        type: "internal-detail",
        xPct: 8.2,
        yPct: 28.6,
        radiusPct: 6,
        hint: "The banner by the portal looks like a different color.",
      },
      {
        id: "butterfly-count",
        type: "count",
        xPct: 87.9,
        yPct: 14.9,
        radiusPct: 6,
        hint: "Count the butterflies in the sky.",
      },
      {
        id: "deer-statue-added",
        type: "added-object",
        xPct: 93.3,
        yPct: 29.8,
        radiusPct: 7,
        hint: "Something new is perched on the right pillar.",
      },
      {
        id: "barrel-replaced",
        type: "internal-detail",
        xPct: 49.0,
        yPct: 54.8,
        radiusPct: 7,
        hint: "Look at what's sitting near the steps.",
      },
      {
        id: "rock-rune-symbol",
        type: "internal-detail",
        xPct: 8.9,
        yPct: 70.8,
        radiusPct: 6,
        hint: "The glowing rune on the fallen slab looks different.",
      },
      {
        id: "pillar-rune-symbol",
        type: "internal-detail",
        xPct: 48.4,
        yPct: 34.5,
        radiusPct: 6,
        hint: "Check the carving on the middle pillar.",
      },
      {
        id: "mushroom-added",
        type: "added-object",
        xPct: 22.5,
        yPct: 84.5,
        radiusPct: 6,
        hint: "Look closely along the stone path.",
      },
      {
        id: "fish-color",
        type: "internal-detail",
        xPct: 77.0,
        yPct: 82.7,
        radiusPct: 6,
        hint: "Something's off with the fish in the pond.",
      },
      {
        id: "dragonfly-missing",
        type: "missing-object",
        xPct: 68.1,
        yPct: 85.7,
        radiusPct: 6,
        hint: "A little flying visitor over the water is gone.",
      },
    ],
  },
];
