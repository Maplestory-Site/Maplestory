import { getNewsItemById } from "../../server/news/service.mjs";

export default async function handler(req, res) {
  const item = await getNewsItemById(req.query?.id);

  if (!item) {
    res.status(404).json({ error: "News item not found" });
    return;
  }

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
  res.status(200).json(item);
}
