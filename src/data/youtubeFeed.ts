import youtubeFeed from "./youtubeVideos.json";
import { fallbackVideos, type VideoItem } from "./siteContent";

type YoutubeFeedShape = {
  channelTitle?: string;
  channelUrl?: string;
  lastSynced?: string;
  videos?: VideoItem[];
};

const typedFeed = youtubeFeed as YoutubeFeedShape;

export const youtubeChannelTitle = typedFeed.channelTitle || "snailslayer";
export const youtubeChannelUrl = typedFeed.channelUrl || "https://www.youtube.com/@snailslayermain";
export const youtubeLastSynced = typedFeed.lastSynced || "";

export const youtubeVideos: VideoItem[] =
  typedFeed.videos && typedFeed.videos.length
    ? typedFeed.videos.map((item, index) => ({ ...item, featured: index === 0 }))
    : fallbackVideos;
