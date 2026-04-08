import type { ComponentType } from "react";
import type { MiniGameId } from "../../../data/miniGames";
import { BossDodgeGame } from "./BossDodgeGame";
import { MapleTrainingGame } from "./MapleTrainingGame";
import { ReactionTestGame } from "./ReactionTestGame";

export const miniGamesRegistry: Record<MiniGameId, ComponentType> = {
  "reaction-test": ReactionTestGame,
  "maple-training": MapleTrainingGame,
  "boss-dodge": BossDodgeGame
};
