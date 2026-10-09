// Dev-only game picker registry — NOT part of the shipped product. Each
// game is normally handed off/deployed on its own; this list just lets
// developers launch any game locally from one screen. Add one entry per
// game folder.
import type { ReactNode } from "react";
import { PathfinderSweepGame } from "./pathfinder-sweep";
import { GatekeeperGame } from "./gatekeeper";
import { DecoyGroveGame } from "./decoy-grove";
import { SwitchYardRescueGame } from "./switch-yard-rescue";

export type DevGameEntry = {
  slug: string;
  title: string;
  render: (onExit: () => void) => ReactNode;
};

export const DEV_GAME_REGISTRY: DevGameEntry[] = [
  {
    slug: "pathfinder-sweep",
    title: "Pathfinder Sweep",
    render: (onExit) => <PathfinderSweepGame ageBand="6-10" onExit={onExit} />,
  },
  {
    slug: "gatekeeper",
    title: "Gatekeeper",
    render: (onExit) => <GatekeeperGame ageBand="6-10" onExit={onExit} />,
  },
  {
    slug: "decoy-grove",
    title: "Decoy Grove",
    render: (onExit) => <DecoyGroveGame ageBand="6-10" onExit={onExit} />,
  },
  {
    slug: "switch-yard-rescue",
    title: "Switch Yard Rescue",
    render: (onExit) => <SwitchYardRescueGame ageBand="6-10" onExit={onExit} />,
  },
];
