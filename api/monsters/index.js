import { getMonsterFeed } from "../../server/monsters/service.mjs";

export default async function handler(_req, res) {
  try {
    const feed = await getMonsterFeed();
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=43200");
    return res.status(200).json(feed);
  } catch (error) {
    console.error("[api/monsters] Failed to load monsters feed:", error);
    return res.status(500).json({
      items: [],
      meta: {
        sourceName: "StrategyWiki MapleStory",
        sourceUrl: "https://strategywiki.org/wiki/MapleStory/Monsters",
        copyrightLabel: "Source: StrategyWiki MapleStory / curated preview",
        updatedAt: new Date().toISOString(),
        sourceStatus: "error",
        syncState: "error",
        itemCount: 0,
        canAutoSync: true,
        error: "Unable to load monsters feed",
      },
    });
  }
}
