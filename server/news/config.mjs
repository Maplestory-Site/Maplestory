import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

export const NEWS_ENDPOINT = "https://g.nexonstatic.com/maplestory/cms/v1/news";
export const ARCHIVED_ENDPOINT = "https://g.nexonstatic.com/maplestory/cms/v1/archived";
export const OFFICIAL_SITE_ROOT = "https://www.nexon.com";
export const OFFICIAL_NEWS_ROOT = "https://www.nexon.com/maplestory/news";
export const ORANGE_MUSHROOM_KMS_RSS = "https://orangemushroom.net/category/kms/feed/";
export const ORANGE_MUSHROOM_KMS_ROOT = "https://orangemushroom.net/category/kms/";
export const CACHE_TTL_MINUTES = 180;
export const MAX_ITEMS = 120;
export const FETCH_TIMEOUT_MS = 12000;
export const KMS_FEED_TTL_MINUTES = 1440;
export const KMS_ARTICLE_TTL_MINUTES = 1440;
export const GMS_ARTICLE_TTL_MINUTES = 1440;

export const BUNDLED_FEED_FILE = path.resolve(PROJECT_ROOT, "src", "data", "newsFeed.json");
const runtimeCacheRoot =
  process.env.NEWS_CACHE_DIR ||
  process.env.TMPDIR ||
  process.env.TEMP ||
  process.env.TMP ||
  path.resolve(PROJECT_ROOT, "cache");

export const CACHE_FILE = path.resolve(runtimeCacheRoot, "news-feed.json");
export const KMS_FEED_FILE = path.resolve(runtimeCacheRoot, "kms-feed.json");
export const KMS_ARTICLE_CACHE_FILE = path.resolve(runtimeCacheRoot, "kms-articles.json");
export const GMS_ARTICLE_CACHE_FILE = path.resolve(runtimeCacheRoot, "gms-articles.json");

export const OFFICIAL_SOURCE = {
  sourceName: "Official MapleStory / Nexon",
  sourceUrl: OFFICIAL_NEWS_ROOT,
  copyrightLabel: "Source: Official MapleStory / Nexon"
};

export const KMS_SOURCE = {
  sourceName: "Orange Mushroom (KMS)",
  sourceUrl: ORANGE_MUSHROOM_KMS_ROOT,
  copyrightLabel: "Source: Orange Mushroom (KMS)"
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
