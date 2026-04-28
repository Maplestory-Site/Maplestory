import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { MiniGameId } from "../../../data/miniGames";

type MiniGameComponent = LazyExoticComponent<ComponentType>;

const ReactionTestGame = lazy(() => import("./ReactionTestGame").then((module) => ({ default: module.ReactionTestGame })));
const MapleTrainingGame = lazy(() => import("./MapleTrainingGame").then((module) => ({ default: module.MapleTrainingGame })));
const MapleSurvivalGame = lazy(() => import("./MapleSurvivalGame").then((module) => ({ default: module.MapleSurvivalGame })));
const BossDodgeGame = lazy(() => import("./BossDodgeGame").then((module) => ({ default: module.BossDodgeGame })));
const TapDodgeGame = lazy(() => import("./TapDodgeGame").then((module) => ({ default: module.TapDodgeGame })));
const ReactionTimerProGame = lazy(() => import("./ReactionTimerProGame").then((module) => ({ default: module.ReactionTimerProGame })));
const StackBuilderGame = lazy(() => import("./StackBuilderGame").then((module) => ({ default: module.StackBuilderGame })));
const AimTrainerGame = lazy(() => import("./AimTrainerGame").then((module) => ({ default: module.AimTrainerGame })));
const NeoSnakeGame = lazy(() => import("./NeoSnakeGame").then((module) => ({ default: module.NeoSnakeGame })));
const BombDefuseGame = lazy(() => import("./BombDefuseGame").then((module) => ({ default: module.BombDefuseGame })));
const MemoryFlashGame = lazy(() => import("./MemoryFlashGame").then((module) => ({ default: module.MemoryFlashGame })));
const LaneSwitchRunnerGame = lazy(() => import("./LaneSwitchRunnerGame").then((module) => ({ default: module.LaneSwitchRunnerGame })));
const IceSlidePuzzleGame = lazy(() => import("./IceSlidePuzzleGame").then((module) => ({ default: module.IceSlidePuzzleGame })));
const BossClickerGame = lazy(() => import("./BossClickerGame").then((module) => ({ default: module.BossClickerGame })));
const IdleStoryWorldGame = lazy(() => import("./IdleStoryWorldGame").then((module) => ({ default: module.IdleStoryWorldGame })));

export const miniGamesRegistry: Record<MiniGameId, MiniGameComponent> = {
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
  "boss-clicker": BossClickerGame,
  "idlestory-world": IdleStoryWorldGame
};
