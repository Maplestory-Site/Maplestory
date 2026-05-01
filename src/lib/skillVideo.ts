/**
 * skillVideo.ts — pure helpers for the Library skill video preview system.
 *
 * Responsibilities:
 *  - classify a video URL as `youtube` or `mp4`
 *  - convert a YouTube watch URL to an embed URL (so the iframe never redirects)
 *  - validate that a URL is safe to render inline (no `javascript:`, `data:`, etc.)
 *
 * No React, no DOM, no fetch. Easy to unit-test.
 *
 * Every URL the UI eventually hands to an `<iframe>` or `<video>` tag is
 * processed through `getSkillVideoMeta` first. The function returns a
 * `null` embed for any input that doesn't look like a safe http(s) media
 * URL — the modal then falls back to the "no preview available" state.
 */

export type SkillVideoType = "youtube" | "mp4";

export type SkillVideoMeta = {
  /** Original raw URL the caller supplied. */
  source: string;
  /** Canonical embed URL safe to use as iframe `src`. Null if not embeddable. */
  embed: string | null;
  /** Detected video type. */
  type: SkillVideoType | null;
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be"
]);

const MP4_EXTENSION = /\.(mp4|webm|ogg)(?:\?.*)?$/i;

/** True if the URL string is a non-empty, http(s) (or root-relative) URL. */
export function isSafeMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true; // local /videos/skills/foo.mp4
  if (/^(?:javascript|data|vbscript|file):/i.test(trimmed)) return false;
  return /^https?:\/\//i.test(trimmed);
}

/**
 * Extracts the YouTube video ID from any of the common URL shapes.
 * Returns null if the URL is not a recognised YouTube link.
 */
export function extractYouTubeId(rawUrl: string): string | null {
  if (!isSafeMediaUrl(rawUrl)) return null;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!YOUTUBE_HOSTS.has(parsed.hostname)) return null;

  const isValidId = (value: string | null | undefined): value is string =>
    typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value);

  if (parsed.hostname === "youtu.be") {
    const id = parsed.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
    return isValidId(id) ? id : null;
  }

  const v = parsed.searchParams.get("v");
  if (isValidId(v)) return v;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if ((segments[0] === "embed" || segments[0] === "shorts") && isValidId(segments[1])) {
    return segments[1] ?? null;
  }

  return null;
}

/** True if the URL is a recognisable YouTube video link. */
export function isYouTubeUrl(rawUrl: unknown): rawUrl is string {
  return typeof rawUrl === "string" && extractYouTubeId(rawUrl) !== null;
}

/** True if the URL is a direct mp4/webm/ogg media file. */
export function isDirectMediaUrl(rawUrl: unknown): rawUrl is string {
  if (!isSafeMediaUrl(rawUrl)) return false;
  return MP4_EXTENSION.test(rawUrl);
}

/**
 * Convert any supported YouTube URL into the canonical embed URL with privacy
 * + autoplay parameters so the iframe loads immediately and respects browser
 * autoplay policies.
 */
export function getYouTubeEmbedUrl(rawUrl: string): string | null {
  const id = extractYouTubeId(rawUrl);
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1"
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/**
 * Combines URL detection + canonicalisation. Used by `<SkillVideoModal>` to
 * decide whether to render an `<iframe>` (YouTube) or a `<video>` tag (mp4).
 */
export function getSkillVideoMeta(
  rawUrl: string | null | undefined,
  hint?: SkillVideoType | null
): SkillVideoMeta {
  if (!rawUrl) return { source: "", embed: null, type: null };
  const trimmed = rawUrl.trim();
  if (!isSafeMediaUrl(trimmed)) return { source: trimmed, embed: null, type: null };

  const embed = getYouTubeEmbedUrl(trimmed);
  if (embed) return { source: trimmed, embed, type: "youtube" };

  if (isDirectMediaUrl(trimmed) || hint === "mp4") {
    return { source: trimmed, embed: trimmed, type: "mp4" };
  }

  return { source: trimmed, embed: null, type: null };
}
