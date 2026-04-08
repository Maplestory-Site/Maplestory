export type MiniGameId = "reaction-test" | "maple-training" | "boss-dodge";

export type MiniGameDefinition = {
  id: MiniGameId;
  title: string;
  description: string;
  icon: string;
  type: string;
  difficulty?: string;
};

export const miniGames: MiniGameDefinition[] = [
  {
    id: "reaction-test",
    title: "Reaction Test",
    description: "Test your timing and stop inside the perfect zone.",
    icon: "RT",
    type: "Timing",
    difficulty: "Fast"
  },
  {
    id: "maple-training",
    title: "Maple Training",
    description: "Train up, build progress, and improve your stats.",
    icon: "MT",
    type: "Training",
    difficulty: "Steady"
  },
  {
    id: "boss-dodge",
    title: "Boss Dodge",
    description: "Survive incoming attacks and last as long as possible.",
    icon: "BD",
    type: "Survival",
    difficulty: "Sharp"
  }
];
