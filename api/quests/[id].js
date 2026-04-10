import { getQuestDetailById } from "../../server/quests/service.mjs";

export default async function handler(req, res) {
  try {
    const detail = await getQuestDetailById(req.query?.id);

    if (!detail) {
      res.status(404).json({ error: "Quest not found" });
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=43200");
    res.status(200).json(detail);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown quest detail error",
    });
  }
}
