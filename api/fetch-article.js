export default async function handler(req, res) {
  const { url } = req.query ?? {};
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing url parameter." });
    return;
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      res.status(400).json({ error: "Invalid URL protocol." });
      return;
    }
  } catch {
    res.status(400).json({ error: "Invalid URL." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch article." });
      return;
    }

    const html = await response.text();
    res.status(200).json({ html });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch article." });
  } finally {
    clearTimeout(timeout);
  }
}
