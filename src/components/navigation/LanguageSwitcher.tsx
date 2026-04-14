import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";

type LanguageSwitcherProps = {
  compact?: boolean;
};

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { language, languageMeta, languages, setLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  function toggleOpen() {
    setIsOpen((prev) => !prev);
  }

  function handleSelect(code: string) {
    setLanguage(code as typeof language);
    setIsOpen(false);
  }

  return (
    <div className={`language-switcher ${compact ? "language-switcher--compact" : ""}`} ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`language-switcher__button ${isOpen ? "is-open" : ""}`}
        onClick={toggleOpen}
        type="button"
      >
        <span className="language-switcher__label">{languageMeta.label.toUpperCase()}</span>
        <span className="language-switcher__chevron" aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="language-switcher__menu" role="listbox" aria-label={t("Select language")}>
          {languages.map((lang) => (
            <button
              className={`language-switcher__option ${lang.code === language ? "is-active" : ""}`}
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              role="option"
              aria-selected={lang.code === language}
              type="button"
            >
              <span>{lang.label}</span>
              <small>{lang.nativeLabel}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
