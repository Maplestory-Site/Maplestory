import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

export const NEWS_ENDPOINT = "https://g.nexonstatic.com/maplestory/cms/v1/news";
export const ARCHIVED_ENDPOINT = "https://g.nexonstatic.com/maplestory/cms/v1/archived";
export const OFFICIAL_SITE_ROOT = "https://www.nexon.com";
export const OFFICIAL_NEWS_ROOT = "https://www.nexon.com/maplestory/news";
export const CACHE_TTL_MINUTES = 180;
export const MAX_ITEMS = 48;
export const FETCH_TIMEOUT_MS = 12000;

export const CACHE_FILE = path.resolve(PROJECT_ROOT, "cache", "news-feed.json");
export const BUNDLED_FEED_FILE = path.resolve(PROJECT_ROOT, "src", "data", "newsFeed.json");

export const OFFICIAL_SOURCE = {
  sourceName: "Official MapleStory / Nexon",
  sourceUrl: OFFICIAL_NEWS_ROOT,
  copyrightLabel: "Source: Official MapleStory / Nexon"
};

export const EMPTY_FEED = {
  items: [],
  meta: {
    lastUpdated: "",
    lastSuccessfulSync: "",
    cacheTtlMinutes: CACHE_TTL_MINUTES,
    sourceStatus: "cached",
    itemCount: 0,
    freshItemCount: 0,
    canAutoSync: true,
    sourceName: OFFICIAL_SOURCE.sourceName
  }
};
