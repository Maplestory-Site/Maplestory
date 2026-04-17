import type { AiFutureIdea } from "../../data/aiExperience";
import { useI18n } from "../../i18n/I18nProvider";

type FutureIdeasPanelProps = {
  items: AiFutureIdea[];
};

export function FutureIdeasPanel({ items }: FutureIdeasPanelProps) {
  const { t, td } = useI18n();

  return (
    <article className="card future-ideas-panel" data-reveal>
      <span className="section-header__eyebrow">{t("Future AI")}</span>
      <h3>{t("Ready for what comes next")}</h3>
      <div className="future-ideas-panel__list">
        {items.map((item) => (
          <article className="future-idea-card" key={item.id}>
            <span className="future-idea-card__badge">{td(item.badge)}</span>
            <strong>{td(item.title)}</strong>
            <p>{td(item.description)}</p>
          </article>
        ))}
      </div>
    </article>
  );
}
