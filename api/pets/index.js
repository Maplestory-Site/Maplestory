import { getPetFeed } from "../../server/pets/service.mjs";

export default async function handler(_request, response) {
  try {
    const feed = await getPetFeed();
    response.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
    response.status(200).json(feed);
  } catch (error) {
    response.status(500).json({
      items: [],
      meta: {
        sourceName: "StrategyWiki",
        sourceUrl: "https://strategywiki.org/wiki/MapleStory/Pets",
        copyrightLabel: "Source: StrategyWiki / curated pet preview",
        updatedAt: new Date().toISOString(),
        syncState: "error",
        itemCount: 0,
        error: error instanceof Error ? error.message : "Unknown pets error",
      },
    });
  }
}
