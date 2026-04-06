export type NavItem = {
  label: string;
  href: string;
};

export type VideoItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  published: string;
  href: string;
  thumbnail?: string;
  viewCount?: string;
  featured?: boolean;
};

export type HighlightItem = {
  id: string;
  title: string;
  duration: string;
  label: string;
  href: string;
  featured?: boolean;
};

export type CategoryItem = {
  title: string;
  description: string;
  href: string;
  accent: "blue" | "cyan" | "violet";
};

export type SocialItem = {
  platform: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  badge?: string;
};

export type StreamDetails = {
  status: "live" | "offline";
  title: string;
  description: string;
  nextStream: string;
  viewerCount?: number;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export const navigationItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Videos", href: "/videos" },
  { label: "Live", href: "/live" },
  { label: "About", href: "/about" },
  { label: "Community", href: "/community" },
  { label: "Contact", href: "/contact" }
];

export const headerActions = {
  primary: { label: "Watch Live", href: "https://www.twitch.tv/snailslayermain" },
  secondary: { label: "Join Discord", href: "/community" }
};

export const heroContent = {
  eyebrow: "SNAILSLAYER • MapleStory • Live Streams",
  title: "Clean guides. Stronger runs. Better decisions.",
  description:
    "MapleStory bossing, progression, and live content for players who want real progress.",
  statusLabel: "Live Now",
  featuredTitle: "Progression, bossing, and live sessions with a premium MapleStory feel",
  featuredDescription:
    "Fresh uploads, clean clears, community updates, and live runs that stay focused on what actually matters."
};

export const creatorPoints = [
  "Built around useful clears",
  "Progression-first content",
  "Live community-driven sessions"
];

export const fallbackVideos: VideoItem[] = [
  {
    id: "video-1",
    title: "The cleanest way to prep for new boss progression",
    description: "A focused breakdown of setup, node choices, and the mistakes that slow down your clears.",
    category: "Progression",
    duration: "14 min",
    published: "2 days ago",
    href: "https://www.youtube.com/@snailslayermain",
    featured: true
  },
  {
    id: "video-2",
    title: "What actually matters before your first serious clear",
    description: "Fast prep priorities for players pushing into harder content.",
    category: "Guides",
    duration: "11 min",
    published: "5 days ago",
    href: "https://www.youtube.com/@snailslayermain"
  },
  {
    id: "video-3",
    title: "Bossing mistakes that cost more damage than you think",
    description: "A practical look at clean execution under pressure.",
    category: "Bossing",
    duration: "9 min",
    published: "1 week ago",
    href: "https://www.youtube.com/@snailslayermain"
  },
  {
    id: "video-4",
    title: "Progression update: where the account goes next",
    description: "Real upgrade choices, route planning, and the next push.",
    category: "Progression",
    duration: "16 min",
    published: "1 week ago",
    href: "https://www.youtube.com/@snailslayermain"
  }
];

export const contentCategories: CategoryItem[] = [
  { title: "Bossing Guides", description: "Mechanics, prep, and execution explained cleanly.", href: "/videos", accent: "blue" },
  { title: "Progression Content", description: "Real account growth, upgrades, and route planning.", href: "/videos", accent: "violet" },
  { title: "Class Insights", description: "Build choices and practical notes that matter in runs.", href: "/about", accent: "cyan" },
  { title: "Highlights", description: "Fast clips from clears, close calls, and stream moments.", href: "/community", accent: "blue" }
];

export const highlightClips: HighlightItem[] = [
  { id: "clip-1", title: "The run almost fell apart and still converted", duration: "00:42", label: "Top Moment", href: "/community", featured: true },
  { id: "clip-2", title: "Patch notes reaction in one clean minute", duration: "00:58", label: "Clip", href: "/community" },
  { id: "clip-3", title: "The damage spike that changed the whole run", duration: "00:34", label: "Recent Highlight", href: "/community" },
  { id: "clip-4", title: "Viewers called it before the clear happened", duration: "00:51", label: "Stream Moment", href: "/community" }
];

export const socialLinks: SocialItem[] = [
  { platform: "Discord", title: "Stay close to the community", description: "Get stream alerts, patch talk, and MapleStory discussion.", href: "/community", ctaLabel: "Join Discord", badge: "Best Place to Start" },
  { platform: "Telegram", title: "Get quick updates on Telegram", description: "Channel drops, alerts, and fast updates in one place.", href: "https://t.me/snailslayermain", ctaLabel: "Open Telegram", badge: "Fast Updates" },
  { platform: "YouTube", title: "Watch full MapleStory videos", description: "Guides, bossing breakdowns, and progression uploads.", href: "https://www.youtube.com/@snailslayermain", ctaLabel: "Open YouTube", badge: "New Uploads" },
  { platform: "Twitch", title: "Catch the stream live", description: "Boss attempts, progression sessions, and viewer questions.", href: "https://www.twitch.tv/snailslayermain", ctaLabel: "Watch Twitch", badge: "Live Focus" }
];

export const footerGroups = [
  { title: "Explore", links: navigationItems },
  {
    title: "Platforms",
    links: [
      { label: "Discord", href: "/community" },
      { label: "Telegram", href: "https://t.me/snailslayermain" },
      { label: "YouTube", href: "https://www.youtube.com/@snailslayermain" },
      { label: "Twitch", href: "https://www.twitch.tv/snailslayermain" }
    ]
  },
  {
    title: "Business",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Partnerships", href: "/contact" },
      { label: "Collaborations", href: "/contact" }
    ]
  }
];

export const streamDetails: StreamDetails = {
  status: "offline",
  title: "Nightly progression and bossing sessions",
  description: "Live runs, account decisions, clean breakdowns, and viewer questions in real time.",
  nextStream: "Follow on Twitch for the next live session",
  viewerCount: undefined,
  primaryCta: { label: "Watch on Twitch", href: "https://www.twitch.tv/snailslayermain" },
  secondaryCta: { label: "Get Stream Alerts", href: "/community" }
};

export const aboutPoints = [
  "Bossing runs with real progression.",
  "Guides that stay clear and useful.",
  "Live sessions with the community."
];

export const communityBenefits = [
  "Get stream alerts first",
  "Talk MapleStory with the community",
  "See updates, clips, and drops",
  "Stay close to every upload"
];

export const contactTopics = ["Sponsorship", "Brand Partnership", "Collaboration", "Media Request"];

export const businessEmail = "Snailslayermain@gmail.com";
