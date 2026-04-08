import { getLatestNews } from "../../server/news/service.mjs";

export default async function handler(req, res) {
  const requestedLimit = Number.parseInt(String(req.query?.limit ?? "6"), 10);
  const payload = await getLatestNews(Number.isFinite(requestedLimit) ? requestedLimit : 6);
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
  res.status(200).json(payload);
}
