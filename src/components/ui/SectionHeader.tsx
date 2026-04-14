import { Button } from "./Button";
import { useI18n } from "../../i18n/I18nProvider";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  centered?: boolean;
};

export function SectionHeader({ eyebrow, title, description, action, centered = false }: SectionHeaderProps) {
  const { t } = useI18n();
  return (
    <div className={`section-header ${centered ? "section-header--centered" : ""}`}>
      <div>
        {eyebrow ? <span className="section-header__eyebrow">{t(eyebrow)}</span> : null}
        <h2>{t(title)}</h2>
        {description ? <p>{t(description)}</p> : null}
      </div>
      {action ? <Button href={action.href} variant="ghost">{t(action.label)}</Button> : null}
    </div>
  );
}
