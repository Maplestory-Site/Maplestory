import { getMapFeed } from "../../server/maps/service.mjs";

export default async function handler(_req, res) {
  try {
    const feed = await getMapFeed();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=43200");
    return res.status(200).json(feed);
  } catch (error) {
    console.error("[api/maps] Failed to load maps feed:", error);
    return res.status(500).json({
      items: [],
      meta: {
        sourceName: "Maplemaps",
        sourceUrl: "https://maplemaps.net/",
        copyrightLabel: "Source: Maplemaps / curated map preview",
        updatedAt: new Date().toISOString(),
        syncState: "error",
        itemCount: 0,
      },
    });
  }
}
