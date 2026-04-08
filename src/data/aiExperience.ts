export type AiClipCategory = "boss fight" | "progression" | "funny moment";

export type HighlightSuggestion = {
  id: string;
  title: string;
  reason: string;
  category: AiClipCategory;
  confidence: string;
  ctaLabel: string;
  href: string;
};

export type StreamSummaryItem = {
  id: string;
  label: string;
  value: string;
};

export type StreamSummary = {
  title: string;
  description: string;
  points: StreamSummaryItem[];
};

export type RecommendationSeed = {
  id: string;
  title: string;
  category: AiClipCategory;
  note: string;
  href: string;
};

export type AiFutureIdea = {
  id: string;
  title: string;
  description: string;
  badge: string;
};

export type NotificationPreference = {
  id: "live" | "videos" | "clips";
  label: string;
  description: string;
};

export const notificationPreferenceOptions: NotificationPreference[] = [
  {
    id: "live",
    label: "Notify me when live",
    description: "Get the alert the moment stream starts."
  },
  {
    id: "videos",
    label: "New video alert",
    description: "Catch fresh uploads without checking twice."
  },
  {
    id: "clips",
    label: "Clip of the day",
    description: "One fast highlight worth the click."
  }
];

export const aiHighlightSuggestions: HighlightSuggestion[] = [
  {
    id: "highlight-1",
    title: "Boss push with a clean recovery",
    reason: "High reaction spike + strong viewer replay value.",
    category: "boss fight",
    confidence: "92% match",
    ctaLabel: "Watch this clip",
    href: "/videos"
  },
  {
    id: "highlight-2",
    title: "Upgrade call that changed the route",
    reason: "Clear progression decision with strong watch time.",
    category: "progression",
    confidence: "88% match",
    ctaLabel: "See the breakdown",
    href: "/videos"
  },
  {
    id: "highlight-3",
    title: "One funny fail worth replaying",
    reason: "Fast payoff, strong retention, great short-form hook.",
    category: "funny moment",
    confidence: "84% match",
    ctaLabel: "Play the moment",
    href: "/videos"
  }
];

export const streamSummary: StreamSummary = {
  title: "What happened last stream",
  description: "The short version. No VOD digging.",
  points: [
    { id: "summary-1", label: "Boss push", value: "Two clean clears and one near miss." },
    { id: "summary-2", label: "Progression", value: "Real upgrade call that changed the next route." },
    { id: "summary-3", label: "Community", value: "Q&A around setup, prep, and next goals." }
  ]
};

export const recommendationSeeds: RecommendationSeed[] = [
  {
    id: "rec-1",
    title: "More clean bossing clips",
    category: "boss fight",
    note: "Based on recent clears and boss attempts.",
    href: "/videos"
  },
  {
    id: "rec-2",
    title: "Progression choices worth stealing",
    category: "progression",
    note: "Built from account push clips and route decisions.",
    href: "/videos"
  },
  {
    id: "rec-3",
    title: "Fast moments with replay value",
    category: "funny moment",
    note: "Short hits pulled from recent community favorites.",
    href: "/videos"
  }
];

export const aiFutureIdeas: AiFutureIdea[] = [
  {
    id: "future-1",
    title: "Ask about last stream",
    description: "Mock AI assistant that answers what happened, what dropped, and what comes next.",
    badge: "AI chat"
  },
  {
    id: "future-2",
    title: "Voice command queue",
    description: "Future quick actions like play latest clip, open live, or check next stream.",
    badge: "Voice"
  },
  {
    id: "future-3",
    title: "Smart clip routing",
    description: "Auto-pick the strongest moments for shorts, clips, and social drops.",
    badge: "Automation"
  }
];
