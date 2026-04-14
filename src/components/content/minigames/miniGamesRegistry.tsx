import type { ComponentType } from "react";
import type { MiniGameId } from "../../../data/miniGames";
import { BossDodgeGame } from "./BossDodgeGame";
import { MapleTrainingGame } from "./MapleTrainingGame";
import { ReactionTestGame } from "./ReactionTestGame";
import { TapDodgeGame } from "./TapDodgeGame";
import { ReactionTimerProGame } from "./ReactionTimerProGame";
import { StackBuilderGame } from "./StackBuilderGame";
import { AimTrainerGame } from "./AimTrainerGame";
import { NeoSnakeGame } from "./NeoSnakeGame";
import { BombDefuseGame } from "./BombDefuseGame";
import { MemoryFlashGame } from "./MemoryFlashGame";
import { LaneSwitchRunnerGame } from "./LaneSwitchRunnerGame";
import { IceSlidePuzzleGame } from "./IceSlidePuzzleGame";
import { BossClickerGame } from "./BossClickerGame";
import { MapleSurvivalGame } from "./MapleSurvivalGame";

export const miniGamesRegistry: Record<MiniGameId, ComponentType> = {
  "reaction-test": ReactionTestGame,
  "maple-training": MapleTrainingGame,
  "maple-survival": MapleSurvivalGame,
  "boss-dodge": BossDodgeGame,
  "tap-dodge": TapDodgeGame,
  "reaction-timer-pro": ReactionTimerProGame,
  "stack-builder": StackBuilderGame,
  "aim-trainer": AimTrainerGame,
  "neo-snake": NeoSnakeGame,
  "bomb-defuse": BombDefuseGame,
  "memory-flash": MemoryFlashGame,
  "lane-switch-runner": LaneSwitchRunnerGame,
  "ice-slide-puzzle": IceSlidePuzzleGame,
  "boss-clicker": BossClickerGame
};
