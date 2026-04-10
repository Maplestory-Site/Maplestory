import { getItemFeed } from "../../server/items/service.mjs";

export default async function handler(_req, res) {
  try {
    const feed = await getItemFeed();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=43200");
    return res.status(200).json(feed);
  } catch (error) {
    console.error("[api/items] Failed to load items feed:", error);
    return res.status(500).json({
      items: [],
      meta: {
        sourceName: "MapleStory Fandom",
        sourceUrl: "https://maplestory.fandom.com/wiki/Item",
        copyrightLabel: "Source: MapleStory Fandom / curated item preview",
        updatedAt: new Date().toISOString(),
        syncState: "error",
        itemCount: 0,
      },
    });
  }
}
