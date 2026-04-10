import os from "node:os";
import path from "node:path";

export const MAPS_SOURCE_URL = "https://maplemaps.net/";
export const MAPS_FETCH_URL = "https://v66rewn65j.execute-api.us-west-2.amazonaws.com/prod/fetch-mongodb";
export const MAPS_IMAGE_BASE_URL = "https://d3uzjcc4cyf4cj.cloudfront.net";
export const MAPS_FETCH_TIMEOUT_MS = 30000;
export const MAPS_CACHE_TTL_MINUTES = 720;
export const MAPS_RUNTIME_CACHE_DIR = path.join(os.tmpdir(), "snailslayer-map-cache");
export const MAPS_RUNTIME_CACHE_FILE = path.join(MAPS_RUNTIME_CACHE_DIR, "maps-feed.json");
export const MAPS_SOURCE_META = {
  sourceName: "Maplemaps",
  sourceUrl: MAPS_SOURCE_URL,
  copyrightLabel: "Source: Maplemaps / curated map preview",
};
