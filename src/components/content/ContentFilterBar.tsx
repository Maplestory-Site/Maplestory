import type { ContentFilterDefinition, ContentFilterKey } from "../../lib/contentDiscovery";
import { useI18n } from "../../i18n/I18nProvider";

type ContentFilterBarProps = {
  activeFilter: ContentFilterKey;
  filters: ContentFilterDefinition[];
  counts: Record<ContentFilterKey, number>;
  onChange: (filter: ContentFilterKey) => void;
};

export function ContentFilterBar({ activeFilter, filters, counts, onChange }: ContentFilterBarProps) {
  const { t } = useI18n();
  return (
    <div className="content-filter-bar" aria-label="Content filters">
      <div className="content-filter-bar__top">
        <span className="content-filter-bar__eyebrow">{t("Quick Browse")}</span>
        <p>{t("Jump straight to the content lane you want.")}</p>
      </div>
      <div className="content-filter-bar__actions">
        {filters.map((filter) => (
          <button
            aria-pressed={activeFilter === filter.key}
            className={`content-filter-bar__chip ${activeFilter === filter.key ? "is-active" : ""}`}
            key={filter.key}
            onClick={() => onChange(filter.key)}
            type="button"
          >
            <span>{t(filter.label)}</span>
            <small>{counts[filter.key] ?? 0}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
