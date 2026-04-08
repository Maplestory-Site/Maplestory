import type { RecommendationSeed } from "../data/aiExperience";
import type { VideoItem } from "../data/siteContent";
import type { MockWatchHistoryItem } from "../features/profile/mockProfileData";

type RecommendationResult = RecommendationSeed & {
  matchedVideoId?: string;
  thumbnail?: string;
  duration?: string;
};

export type RecommendationCardData = {
  id: string;
  title: string;
  note: string;
  href: string;
  category: RecommendationSeed["category"];
  thumbnail?: string;
  duration?: string;
  badge: string;
};

export type RecommendationSectionData = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: RecommendationCardData[];
};

const categoryMap: Record<string, RecommendationSeed["category"]> = {
  bossing: "boss fight",
  progression: "progression",
  highlights: "funny moment",
  guides: "progression"
};

const categoryLabels: Record<RecommendationSeed["category"], string> = {
  "boss fight": "Boss fight",
  progression: "Progression",
  "funny moment": "Funny moment"
};

function getVideoCategory(video: VideoItem): RecommendationSeed["category"] {
  return categoryMap[video.category.toLowerCase()] || "progression";
}

export function getRecommendedContent(
  seeds: RecommendationSeed[],
  videos: VideoItem[]
): RecommendationResult[] {
  return seeds.map((seed) => {
    const match = videos.find((video) => getVideoCategory(video) === seed.category);

    return {
      ...seed,
      matchedVideoId: match?.id,
      href: match?.href || seed.href,
      thumbnail: match?.thumbnail,
      duration: match?.duration
    };
  });
}

export function buildRecommendationSections(
  videos: VideoItem[],
  history: MockWatchHistoryItem[]
): RecommendationSectionData[] {
  const watchedText = history.map((item) => `${item.title} ${item.type}`.toLowerCase()).join(" ");

  const watchedPreference: RecommendationSeed["category"] =
    watchedText.includes("boss")
      ? "boss fight"
      : watchedText.includes("clip") || watchedText.includes("patch")
        ? "funny moment"
        : "progression";

  const watchedTitles = new Set(history.map((item) => item.title.toLowerCase()));
  const normalizedVideos = videos.map((video) => ({
    ...video,
    recommendationCategory: getVideoCategory(video)
  }));

  const uniqueById = (items: RecommendationCardData[]) =>
    items.filter((item, index, array) => array.findIndex((entry) => entry.id === item.id) === index);

  const toCard = (video: VideoItem & { recommendationCategory: RecommendationSeed["category"] }, badge: string, note: string): RecommendationCardData => ({
    id: video.id,
    title: video.title,
    note,
    href: video.href,
    category: video.recommendationCategory,
    thumbnail: video.thumbnail,
    duration: video.duration,
    badge
  });

  const basedOnWatched = uniqueById(
    normalizedVideos
      .filter((video) => video.recommendationCategory === watchedPreference && !watchedTitles.has(video.title.toLowerCase()))
      .slice(0, 4)
      .map((video) =>
        toCard(
          video,
          "Based on what you watched",
          watchedPreference === "boss fight"
            ? "More clean clears and pressure moments."
            : watchedPreference === "progression"
              ? "More route calls, upgrades, and smart progression."
              : "More fast hits with replay value."
        )
      )
  );

  const youMayLike = uniqueById(
    normalizedVideos
      .slice(0, 6)
      .filter((video) => !basedOnWatched.some((entry) => entry.id === video.id))
      .slice(0, 4)
      .map((video) =>
        toCard(
          video,
          "You may like",
          `A strong ${categoryLabels[video.recommendationCategory].toLowerCase()} pick from recent uploads.`
        )
      )
  );

  const similarClips = uniqueById(
    normalizedVideos
      .filter((video) => video.recommendationCategory !== watchedPreference || video.duration.includes(":"))
      .slice(0, 4)
      .map((video) =>
        toCard(
          video,
          "Similar clips",
          "Fast payoff, easy to scan, and built for quick watching."
        )
      )
  );

  return [
    {
      id: "section-you-may-like",
      eyebrow: "For you",
      title: "You may like",
      description: "Fresh picks with fast payoff.",
      items: youMayLike
    },
    {
      id: "section-based-on-watch",
      eyebrow: "Smart picks",
      title: "Based on what you watched",
      description: "More of what already pulled you in.",
      items: basedOnWatched.length ? basedOnWatched : youMayLike
    },
    {
      id: "section-similar-clips",
      eyebrow: "Quick watch",
      title: "Similar clips",
      description: "Shorter moments worth opening next.",
      items: similarClips
    }
  ];
}
