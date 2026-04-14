import { fetchGmsArticle } from "../../server/news/gmsArticle.mjs";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing url parameter." });
    return;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("nexon.com")) {
      res.status(400).json({ error: "Invalid source host." });
      return;
    }

    const payload = await fetchGmsArticle(url);
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json(payload);
  } catch {
    res.status(500).json({ error: "Failed to load GMS article." });
  }
}
