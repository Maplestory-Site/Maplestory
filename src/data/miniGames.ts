export type MiniGameId =
  | "reaction-test"
  | "maple-training"
  | "maple-survival"
  | "boss-dodge"
  | "tap-dodge"
  | "reaction-timer-pro"
  | "stack-builder"
  | "aim-trainer"
  | "neo-snake"
  | "bomb-defuse"
  | "memory-flash"
  | "lane-switch-runner"
  | "ice-slide-puzzle"
  | "boss-clicker";

export type MiniGameDefinition = {
  id: MiniGameId;
  title: string;
  description: string;
  icon: string;
  type: string;
  difficulty?: string;
  previewImage: string;
};

export const miniGames: MiniGameDefinition[] = [
  {
    id: "reaction-test",
    title: "Reaction Test",
    description: "Test your timing and stop inside the perfect zone.",
    icon: "RT",
    type: "Timing",
    difficulty: "Fast",
    previewImage: "/game-previews/reaction-test.svg"
  },
  {
    id: "maple-training",
    title: "Maple Training",
    description: "Train up, build progress, and improve your stats.",
    icon: "MT",
    type: "Training",
    difficulty: "Steady",
    previewImage: "/game-previews/maple-training.svg"
  },
  {
    id: "maple-survival",
    title: "Maple Survival",
    description: "Eat, grow, and evolve while a hunter tracks you.",
    icon: "MS",
    type: "Survival",
    difficulty: "Start",
    previewImage: "/game-previews/maple-survival.svg"
  },
  {
    id: "boss-dodge",
    title: "Boss Dodge",
    description: "Survive incoming attacks and last as long as possible.",
    icon: "BD",
    type: "Survival",
    difficulty: "Sharp",
    previewImage: "/game-previews/boss-dodge.svg"
  },
  {
    id: "tap-dodge",
    title: "Tap Dodge",
    description: "Stay centered and dodge incoming strikes from every angle.",
    icon: "TD",
    type: "Reflex",
    difficulty: "Rapid",
    previewImage: "/game-previews/tap-dodge.svg"
  },
  {
    id: "reaction-timer-pro",
    title: "Reaction Timer Pro",
    description: "Tap the instant the screen flips. Track your fastest time.",
    icon: "RP",
    type: "Timing",
    difficulty: "Pro",
    previewImage: "/game-previews/reaction-timer-pro.svg"
  },
  {
    id: "stack-builder",
    title: "Stack Builder",
    description: "Drop moving blocks and stack with perfect precision.",
    icon: "SB",
    type: "Precision",
    difficulty: "Flow",
    previewImage: "/game-previews/stack-builder.svg"
  },
  {
    id: "aim-trainer",
    title: "Aim Trainer",
    description: "Tap targets fast and keep your accuracy high.",
    icon: "AT",
    type: "Accuracy",
    difficulty: "Rapid",
    previewImage: "/game-previews/aim-trainer.svg"
  },
  {
    id: "neo-snake",
    title: "Neo Snake",
    description: "Glide, grow, and avoid your own trail.",
    icon: "NS",
    type: "Arcade",
    difficulty: "Flow",
    previewImage: "/game-previews/neo-snake.svg"
  },
  {
    id: "bomb-defuse",
    title: "Bomb Defuse",
    description: "Cut the right wire before the timer hits zero.",
    icon: "BD",
    type: "Pressure",
    difficulty: "Hard",
    previewImage: "/game-previews/bomb-defuse.svg"
  },
  {
    id: "memory-flash",
    title: "Memory Flash",
    description: "Repeat the flash pattern and build your streak.",
    icon: "MF",
    type: "Memory",
    difficulty: "Focus",
    previewImage: "/game-previews/memory-flash.svg"
  },
  {
    id: "lane-switch-runner",
    title: "Lane Switch Runner",
    description: "Switch lanes fast and survive the endless run.",
    icon: "LR",
    type: "Runner",
    difficulty: "Swift",
    previewImage: "/game-previews/lane-switch-runner.svg"
  },
  {
    id: "ice-slide-puzzle",
    title: "Ice Slide Puzzle",
    description: "Slide to the goal without stopping mid-path.",
    icon: "IP",
    type: "Puzzle",
    difficulty: "Smart",
    previewImage: "/game-previews/ice-slide-puzzle.svg"
  },
  {
    id: "boss-clicker",
    title: "Boss Clicker",
    description: "Tap hard, drop the HP, and survive the counter hits.",
    icon: "BC",
    type: "Boss",
    difficulty: "Pulse",
    previewImage: "/game-previews/boss-clicker.svg"
  }
];
