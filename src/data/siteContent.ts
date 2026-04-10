export type NavItem = {
  label: string;
  href: string;
};

export type VideoItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags?: string[];
  duration: string;
  published: string;
  href: string;
  thumbnail?: string;
  viewCount?: string;
  featured?: boolean;
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
  { label: "Classes", href: "/classes" },
  { label: "News", href: "/news" },
  { label: "Videos", href: "/videos" },
  { label: "Live", href: "/live" },
  { label: "Community", href: "/community" },
  { label: "Monsters", href: "/monsters" }
];

export const secondaryNavigationItems: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" }
];

export const headerActions = {
  primary: { label: "Watch Live", href: "https://www.twitch.tv/snailslayermain" },
  secondary: { label: "Join Discord", href: "/community" }
};

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

export const socialLinks: SocialItem[] = [
  {
    platform: "Discord",
    title: "Get inside before the next run",
    description: "Live alerts, fast help, patch talk, and the real SNAILSLAYER community loop.",
    href: "/community",
    ctaLabel: "Join Discord First",
    badge: "Best Place to Start"
  },
  {
    platform: "Telegram",
    title: "Fast drops",
    description: "Quick updates, alerts, and patch notes.",
    href: "https://t.me/snailslayermain",
    ctaLabel: "Join Telegram",
    badge: "Fast Alerts"
  },
  {
    platform: "YouTube",
    title: "Watch the full breakdown",
    description: "Guides, boss runs, and progression uploads.",
    href: "https://www.youtube.com/@snailslayermain",
    ctaLabel: "See New Videos",
    badge: "Latest Videos"
  },
  {
    platform: "Twitch",
    title: "Catch the run live",
    description: "Boss attempts, live calls, and real-time questions.",
    href: "https://www.twitch.tv/snailslayermain",
    ctaLabel: "Watch Live",
    badge: "Live Now"
  }
];

export const footerGroups = [
  { title: "Explore", links: navigationItems },
  {
    title: "Community",
    links: [
      { label: "Discord", href: "/community" },
      { label: "Telegram", href: "https://t.me/snailslayermain" },
      { label: "YouTube", href: "https://www.youtube.com/@snailslayermain" },
      { label: "Twitch", href: "https://www.twitch.tv/snailslayermain" }
    ]
  },
  {
    title: "Contact",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Email", href: "mailto:Snailslayermain@gmail.com" }
    ]
  }
];

export const streamDetails: StreamDetails = {
  status: "offline",
  title: "Next stream starts here",
  description: "Bossing, progression, and live MapleStory calls.",
  nextStream: "Follow for the next run",
  viewerCount: undefined,
  primaryCta: { label: "Watch Live", href: "https://www.twitch.tv/snailslayermain" },
  secondaryCta: { label: "Get Alerts", href: "/community" }
};

export const aboutPoints = [
  "Deep detail. No filler.",
  "Reliable info. Real opinion.",
  "Need help? Reach out."
];

export const communityBenefits = [
  "Get the live alert before everyone else",
  "Ask for help and get real answers",
  "Catch clips, drops, and patch updates fast",
  "Stay close to every upload and stream move"
];

export const contactTopics = ["Collab", "Sponsorship", "Partnership", "General"];

export const businessEmail = "Snailslayermain@gmail.com";
