import { getKmsFeed } from "../../server/news/kmsFeed.mjs";

export default async function handler(_req, res) {
  const feed = await getKmsFeed();
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
  res.status(200).json(feed);
}
