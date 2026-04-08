import { getNewsFeed } from "../../server/news/service.mjs";

export default async function handler(req, res) {
  const secret = process.env.NEWS_REFRESH_SECRET;
  const provided = req.headers["x-news-refresh-secret"] ?? req.query?.secret;

  if (secret && provided !== secret) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  const feed = await getNewsFeed({ forceRefresh: true });
  res.status(200).json({
    ok: true,
    meta: feed.meta,
    itemCount: feed.meta.itemCount,
    freshItemCount: feed.meta.freshItemCount ?? 0,
    lastUpdated: feed.meta.lastUpdated,
    sourceStatus: feed.meta.sourceStatus,
    items: feed.items.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      publishedAt: item.publishedAt,
      sourceUrl: item.sourceUrl,
      isNew: item.isNew ?? false
    }))
  });
}
