import { getItemFeed } from "../server/items/service.mjs";
import { getMapDetail, getMapFeed } from "../server/maps/service.mjs";
import { getMonsterFeed } from "../server/monsters/service.mjs";
import { getPetFeed } from "../server/pets/service.mjs";
import { getQuestDetailById, getQuestFeed } from "../server/quests/service.mjs";

function sendJson(res, status, payload, cacheControl) {
  if (cacheControl) {
    res.setHeader("Cache-Control", cacheControl);
  }
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  const resource = String(req.query?.resource ?? "");

  if (!resource) {
    res.status(400).json({ error: "Missing resource parameter." });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    if (resource === "items") {
      const feed = await getItemFeed();
      sendJson(res, 200, feed, "s-maxage=3600, stale-while-revalidate=43200");
      return;
    }

    if (resource === "maps") {
      const feed = await getMapFeed();
      sendJson(res, 200, feed, "s-maxage=3600, stale-while-revalidate=43200");
      return;
    }

    if (resource === "map-detail") {
      const id = Number(req.query?.id);

      if (!id) {
        res.status(400).json({ error: "Map id is required." });
        return;
      }

      const detail = await getMapDetail(id);
      sendJson(res, 200, detail, "s-maxage=3600, stale-while-revalidate=43200");
      return;
    }

    if (resource === "monsters") {
      const feed = await getMonsterFeed();
      sendJson(res, 200, feed, "s-maxage=1800, stale-while-revalidate=43200");
      return;
    }

    if (resource === "pets") {
      const feed = await getPetFeed();
      sendJson(res, 200, feed, "s-maxage=43200, stale-while-revalidate=86400");
      return;
    }

    if (resource === "quests") {
      const feed = await getQuestFeed();
      sendJson(res, 200, feed, "s-maxage=43200, stale-while-revalidate=86400");
      return;
    }

    if (resource === "quest-detail") {
      const detail = await getQuestDetailById(req.query?.id);

      if (!detail) {
        res.status(404).json({ error: "Quest not found" });
        return;
      }

      sendJson(res, 200, detail, "s-maxage=3600, stale-while-revalidate=43200");
      return;
    }

    res.status(404).json({ error: "Unknown database resource." });
  } catch (error) {
    if (resource === "items") {
      console.error("[api/database:items] Failed to load items feed:", error);
      res.status(500).json({
        items: [],
        meta: {
          sourceName: "MapleStory Fandom",
          sourceUrl: "https://maplestory.fandom.com/wiki/Item",
          copyrightLabel: "Source: MapleStory Fandom / curated item preview",
          updatedAt: new Date().toISOString(),
          syncState: "error",
          itemCount: 0
        }
      });
      return;
    }

    if (resource === "maps") {
      console.error("[api/database:maps] Failed to load maps feed:", error);
      res.status(500).json({
        items: [],
        meta: {
          sourceName: "Maplemaps",
          sourceUrl: "https://maplemaps.net/",
          copyrightLabel: "Source: Maplemaps / curated map preview",
          updatedAt: new Date().toISOString(),
          syncState: "error",
          itemCount: 0
        }
      });
      return;
    }

    if (resource === "monsters") {
      console.error("[api/database:monsters] Failed to load monsters feed:", error);
      res.status(500).json({
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
          error: "Unable to load monsters feed"
        }
      });
      return;
    }

    if (resource === "pets") {
      res.status(500).json({
        items: [],
        meta: {
          sourceName: "StrategyWiki",
          sourceUrl: "https://strategywiki.org/wiki/MapleStory/Pets",
          copyrightLabel: "Source: StrategyWiki / curated pet preview",
          updatedAt: new Date().toISOString(),
          syncState: "error",
          itemCount: 0,
          error: error instanceof Error ? error.message : "Unknown pets error"
        }
      });
      return;
    }

    if (resource === "quests") {
      res.status(500).json({
        items: [],
        meta: {
          sourceName: "MapleStory Fandom",
          sourceUrl: "https://maplestory.fandom.com/wiki/Quests",
          copyrightLabel: "Source: MapleStory Fandom / curated quest preview",
          updatedAt: new Date().toISOString(),
          syncState: "error",
          itemCount: 0,
          error: error instanceof Error ? error.message : "Unknown quests error"
        }
      });
      return;
    }

    if (resource === "map-detail") {
      console.error("[api/database:map-detail] Failed to load map detail:", error);
      res.status(500).json({ error: "Unable to load map detail." });
      return;
    }

    if (resource === "quest-detail") {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown quest detail error"
      });
      return;
    }

    res.status(500).json({ error: "Unhandled database error." });
  }
}
