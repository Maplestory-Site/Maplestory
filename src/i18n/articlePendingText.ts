import type { LanguageCode } from "./languages";

type PendingTextKey = "title" | "body" | "status";

const PENDING_TEXT: Record<string, Record<PendingTextKey, string>> = {
  en: {
    title: "Translating article...",
    body: "Preparing the full article in your selected language.",
    status: "Translating article content..."
  },
  he: {
    title: "מתרגם את הכתבה...",
    body: "מכין את כל הכתבה בשפה שבחרת.",
    status: "מתרגם את תוכן הכתבה..."
  },
  ru: {
    title: "Переводим статью...",
    body: "Готовим полную статью на выбранном языке.",
    status: "Переводим содержимое статьи..."
  },
  de: {
    title: "Artikel wird übersetzt...",
    body: "Der vollständige Artikel wird in deiner ausgewählten Sprache vorbereitet.",
    status: "Artikelinhalt wird übersetzt..."
  },
  fr: {
    title: "Traduction de l’article...",
    body: "Préparation de l’article complet dans la langue sélectionnée.",
    status: "Traduction du contenu de l’article..."
  },
  es: {
    title: "Traduciendo el artículo...",
    body: "Preparando el artículo completo en el idioma seleccionado.",
    status: "Traduciendo el contenido del artículo..."
  },
  pt: {
    title: "Traduzindo o artigo...",
    body: "Preparando o artigo completo no idioma selecionado.",
    status: "Traduzindo o conteúdo do artigo..."
  },
  it: {
    title: "Traduzione dell’articolo...",
    body: "Preparazione dell’articolo completo nella lingua selezionata.",
    status: "Traduzione del contenuto dell’articolo..."
  },
  tr: {
    title: "Makale çevriliyor...",
    body: "Tam makale seçtiğin dilde hazırlanıyor.",
    status: "Makale içeriği çevriliyor..."
  },
  ar: {
    title: "جارٍ ترجمة المقال...",
    body: "يتم تجهيز المقال الكامل باللغة التي اخترتها.",
    status: "جارٍ ترجمة محتوى المقال..."
  },
  ko: {
    title: "기사를 번역하는 중...",
    body: "선택한 언어로 전체 기사를 준비하고 있습니다.",
    status: "기사 내용을 번역하는 중..."
  },
  ja: {
    title: "記事を翻訳中...",
    body: "選択した言語で記事全体を準備しています。",
    status: "記事本文を翻訳中..."
  },
  zh: {
    title: "正在翻译文章...",
    body: "正在用你选择的语言准备完整文章。",
    status: "正在翻译文章内容..."
  }
};

export function getArticlePendingText(language: LanguageCode, key: PendingTextKey) {
  return PENDING_TEXT[language]?.[key] ?? PENDING_TEXT.en[key];
}
