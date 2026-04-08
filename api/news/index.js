import { getNewsFeed } from "../../server/news/service.mjs";

export default async function handler(_req, res) {
  const feed = await getNewsFeed();
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
  res.status(200).json(feed);
}
