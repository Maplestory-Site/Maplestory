export type SafeJsonFetchReason = "http" | "network" | "parse" | "timeout" | "aborted";

export type SafeJsonFetchResult<T> =
  | {
      ok: true;
      data: T;
      status: number;
      error: null;
      reason: null;
      fromFallback: false;
    }
  | {
      ok: false;
      data: T;
      status: number | null;
      error: string;
      reason: SafeJsonFetchReason;
      fromFallback: true;
    };

export type SafeJsonFetchOptions<T> = Omit<RequestInit, "signal"> & {
  fallback: T;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10000;

export async function safeFetchJson<T>(
  url: string,
  {
    fallback,
    fetchImpl = fetch,
    headers,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...init
}: SafeJsonFetchOptions<T>
): Promise<SafeJsonFetchResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  const mergedHeaders = new Headers(headers);
  if (!mergedHeaders.has("Accept")) {
    mergedHeaders.set("Accept", "application/json");
  }

  const abortFromParent = () => controller.abort(signal?.reason ?? "aborted");
  if (signal?.aborted) {
    clearTimeout(timeout);
    return buildFailure(fallback, null, "Request aborted.", "aborted");
  }
  signal?.addEventListener("abort", abortFromParent, { once: true });

  try {
    const response = await fetchImpl(url, {
      ...init,
      headers: mergedHeaders,
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      return buildFailure(fallback, response.status, `Request failed with status ${response.status}.`, "http");
    }

    try {
      const data = (text ? JSON.parse(text) : fallback) as T;
      return {
        ok: true,
        data,
        status: response.status,
        error: null,
        reason: null,
        fromFallback: false
      };
    } catch {
      return buildFailure(fallback, response.status, "Response was not valid JSON.", "parse");
    }
  } catch (error) {
    const reason = controller.signal.reason === "timeout" ? "timeout" : signal?.aborted ? "aborted" : "network";
    const message = error instanceof Error ? error.message : reason === "timeout" ? "Request timed out." : "Network request failed.";
    return buildFailure(fallback, null, message, reason);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromParent);
  }
}

function buildFailure<T>(
  fallback: T,
  status: number | null,
  error: string,
  reason: SafeJsonFetchReason
): SafeJsonFetchResult<T> {
  return {
    ok: false,
    data: fallback,
    status,
    error,
    reason,
    fromFallback: true
  };
}
