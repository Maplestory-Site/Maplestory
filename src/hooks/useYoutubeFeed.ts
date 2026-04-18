import { useEffect, useState } from "react";
import { youtubeChannelTitle, youtubeChannelUrl, youtubeLastSynced, youtubeVideos } from "../data/youtubeFeed";
import type { VideoItem } from "../data/siteContent";

type YoutubeFeed = {
  channelTitle: string;
  channelUrl: string;
  lastSynced: string;
  videos: VideoItem[];
};

const fallbackFeed: YoutubeFeed = {
  channelTitle: youtubeChannelTitle,
  channelUrl: youtubeChannelUrl,
  lastSynced: youtubeLastSynced,
  videos: youtubeVideos
};

export function useYoutubeFeed() {
  const [feed, setFeed] = useState<YoutubeFeed>(fallbackFeed);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFeed() {
      try {
        const response = await fetch(`/api/youtube?ts=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Partial<YoutubeFeed>;
        if (!Array.isArray(payload.videos) || !payload.videos.length) {
          return;
        }

        setFeed({
          channelTitle: payload.channelTitle || fallbackFeed.channelTitle,
          channelUrl: payload.channelUrl || fallbackFeed.channelUrl,
          lastSynced: payload.lastSynced || fallbackFeed.lastSynced,
          videos: payload.videos.map((item, index) => ({ ...item, featured: index === 0 }))
        });
      } catch {
        // Keep the bundled feed if the live endpoint is unavailable.
      }
    }

    void loadFeed();
    const intervalId = window.setInterval(() => {
      void loadFeed();
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
      controller.abort();
    };
  }, []);

  return feed;
}
