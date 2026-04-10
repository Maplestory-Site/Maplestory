import { getQuestFeed } from "../../server/quests/service.mjs";

export default async function handler(_request, response) {
  try {
    const feed = await getQuestFeed();
    response.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
    response.status(200).json(feed);
  } catch (error) {
    response.status(500).json({
      items: [],
      meta: {
        sourceName: "MapleStory Fandom",
        sourceUrl: "https://maplestory.fandom.com/wiki/Quests",
        copyrightLabel: "Source: MapleStory Fandom / curated quest preview",
        updatedAt: new Date().toISOString(),
        syncState: "error",
        itemCount: 0,
        error: error instanceof Error ? error.message : "Unknown quests error",
      },
    });
  }
}
