import { getMapDetail } from "../../server/maps/service.mjs";

export default async function handler(req, res) {
  const id = Number(req.query?.id);

  if (!id) {
    return res.status(400).json({ error: "Map id is required." });
  }

  try {
    const detail = await getMapDetail(id);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=43200");
    return res.status(200).json(detail);
  } catch (error) {
    console.error("[api/maps/:id] Failed to load map detail:", error);
    return res.status(500).json({ error: "Unable to load map detail." });
  }
}
