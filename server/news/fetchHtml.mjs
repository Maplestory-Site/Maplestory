export async function fetchHtml(url, { headers = {}, timeoutMs = 20000 } = {}) {
  const attemptFetch = async (headerSet) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { ...headerSet, ...headers },
        redirect: "follow",
        signal: controller.signal
      });

      const text = await response.text();
      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        text
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await attemptFetch({});
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[fetchHtml] primary fetch failed, retrying with minimal headers.");
    }
    return await attemptFetch({ "User-Agent": "Mozilla/5.0" });
  }
}
