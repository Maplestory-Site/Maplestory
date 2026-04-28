const FALLBACK_MONSTER_PORTRAIT = "\u{1F47E}";

const DASH_VARIANTS = /[\u2013\u2014]/g;
const SMART_QUOTES = /[\u2018\u2019]/g;
const DOUBLE_QUOTES = /[\u201C\u201D]/g;
const BULLETS = /[\u2022]/g;
const ELLIPSIS = /[\u2026]/g;
const CONTROL_OR_REPLACEMENT = /[\u0000-\u001f\u007f\uFFFD]/g;

// Common mojibake fragments represented with escaped bytes so source remains UTF-8 clean.
const MOJIBAKE_SEQUENCE = new RegExp(
  [
    "\\u00c3[\\u0080-\\u00bf]",
    "\\u00e2\\u20ac[\\u0090-\\u00bf]",
    "\\u00e2[\\u0080-\\u00bf]{2}",
    "\\u00c2[\\u0080-\\u00bf]"
  ].join("|"),
  "g"
);

function decodeUtf8MojibakePass(value: string): string {
  try {
    const bytes = Uint8Array.from(Array.from(value).map((char) => char.charCodeAt(0) & 0xff));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return value;
  }
}

function tryDecodeUtf8Mojibake(value: string): string {
  if (!value) return value;
  let next = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!MOJIBAKE_SEQUENCE.test(next)) break;
    MOJIBAKE_SEQUENCE.lastIndex = 0;
    const decoded = decodeUtf8MojibakePass(next);
    if (decoded === next) break;
    next = decoded;
  }
  return next;
}

function getFirstEmoji(value: string): string | null {
  const emojiMatch = value.match(/[\p{Extended_Pictographic}](?:\uFE0F|\u200D[\p{Extended_Pictographic}])*/u);
  return emojiMatch?.[0] ?? null;
}

export function sanitizeGameText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;

  let next = tryDecodeUtf8Mojibake(value).normalize("NFKC");
  next = next
    .replace(DASH_VARIANTS, "-")
    .replace(SMART_QUOTES, "'")
    .replace(DOUBLE_QUOTES, "\"")
    .replace(BULLETS, "*")
    .replace(ELLIPSIS, "...")
    .replace(CONTROL_OR_REPLACEMENT, "")
    .replace(MOJIBAKE_SEQUENCE, "")
    .replace(/\s+/g, " ")
    .trim();

  return next || fallback;
}

export function sanitizeMonsterPortrait(
  portrait: unknown,
  fallback = FALLBACK_MONSTER_PORTRAIT
): string {
  const value = sanitizeGameText(typeof portrait === "string" ? portrait : "", "");
  const safeFallback =
    getFirstEmoji(sanitizeGameText(fallback, FALLBACK_MONSTER_PORTRAIT)) ?? FALLBACK_MONSTER_PORTRAIT;

  if (!value) return safeFallback;
  const parsedEmoji = getFirstEmoji(value);
  if (parsedEmoji) return parsedEmoji;
  if (value.length > 12) return safeFallback;
  if (/^[A-Za-z]{1,4}$/.test(value)) return safeFallback;
  if (/^[A-Za-z0-9 _-]{1,24}$/.test(value)) return safeFallback;
  return safeFallback;
}
