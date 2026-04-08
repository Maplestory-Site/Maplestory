export type AssistantPrompt = {
  id: string;
  label: string;
  response: string;
};

export const assistantPrompts: AssistantPrompt[] = [
  {
    id: "last-stream",
    label: "What happened in last stream?",
    response:
      "Last stream focused on boss attempts, progression calls, and one clean highlight push. The best moments are already clipped and ready to watch."
  },
  {
    id: "best-boss-guide",
    label: "Best boss guide?",
    response:
      "Start with the latest bossing uploads first. They are the fastest path if you want cleaner clears, sharper prep, and fewer wasted runs."
  },
  {
    id: "next-watch",
    label: "What should I watch next?",
    response:
      "Go to the newest upload if you want the full breakdown, or open Clip of the Day if you want the fastest payoff right now."
  }
];

export const assistantIntro = {
  title: "Ask the stream assistant",
  description: "Fast answers. No digging.",
  placeholder: "Ask about the last stream, guides, or what to watch next."
};
