export type LanguageCode =
  | "en"
  | "he"
  | "hr"
  | "ru"
  | "de"
  | "fr"
  | "es"
  | "pt"
  | "it"
  | "tr"
  | "ar"
  | "ko"
  | "ja"
  | "zh"
  | "nl"
  | "pl"
  | "uk"
  | "ro"
  | "el"
  | "cs"
  | "hu"
  | "th"
  | "vi"
  | "id"
  | "ms"
  | "hi";

export type LanguageMeta = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
};

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "he", label: "Hebrew", nativeLabel: "עברית", dir: "rtl" },
  { code: "hr", label: "Croatian", nativeLabel: "Hrvatski", dir: "ltr" },
  { code: "ru", label: "Russian", nativeLabel: "Русский", dir: "ltr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
  { code: "es", label: "Spanish", nativeLabel: "Español", dir: "ltr" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", dir: "ltr" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", dir: "ltr" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "ko", label: "Korean", nativeLabel: "한국어", dir: "ltr" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", dir: "ltr" },
  { code: "zh", label: "Chinese (Simplified)", nativeLabel: "简体中文", dir: "ltr" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands", dir: "ltr" },
  { code: "pl", label: "Polish", nativeLabel: "Polski", dir: "ltr" },
  { code: "uk", label: "Ukrainian", nativeLabel: "Українська", dir: "ltr" },
  { code: "ro", label: "Romanian", nativeLabel: "Română", dir: "ltr" },
  { code: "el", label: "Greek", nativeLabel: "Ελληνικά", dir: "ltr" },
  { code: "cs", label: "Czech", nativeLabel: "Čeština", dir: "ltr" },
  { code: "hu", label: "Hungarian", nativeLabel: "Magyar", dir: "ltr" },
  { code: "th", label: "Thai", nativeLabel: "ไทย", dir: "ltr" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt", dir: "ltr" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia", dir: "ltr" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu", dir: "ltr" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", dir: "ltr" }
];

export const SUPPORTED_LANGUAGE_CODES: LanguageCode[] = [
  "en",
  "he",
  "hr",
  "ru",
  "de",
  "fr",
  "es",
  "pt",
  "it",
  "tr",
  "ar",
  "ko",
  "ja",
  "zh",
  "nl",
  "pl",
  "uk",
  "ro",
  "el",
  "cs",
  "hu",
  "th",
  "vi",
  "id",
  "ms",
  "hi"
];
