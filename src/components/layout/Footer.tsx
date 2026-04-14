import { NavLink } from "react-router-dom";
import { businessEmail, type NavItem } from "../../data/siteContent";
import { useI18n } from "../../i18n/I18nProvider";

type FooterGroup = {
  title: string;
  links: NavItem[];
};

type FooterProps = {
  groups: FooterGroup[];
};

export function Footer({ groups }: FooterProps) {
  const { t } = useI18n();

  function renderLink(link: NavItem) {
    const isExternal = /^(https?:\/\/|mailto:)/.test(link.href);

    if (isExternal) {
      return (
        <a href={link.href} rel={link.href.startsWith("http") ? "noreferrer" : undefined} target={link.href.startsWith("http") ? "_blank" : undefined}>
          {t(link.label)}
        </a>
      );
    }

    return <NavLink to={link.href}>{t(link.label)}</NavLink>;
  }

  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <div className="site-footer__brand-head">
            <span className="brand-lockup__mark brand-lockup__mark--image brand-lockup__mark--footer">
              <img alt="SNAILSLAYER logo" decoding="async" loading="lazy" src="/snailslayer-logo.jpeg" />
            </span>
            <strong>SNAILSLAYER</strong>
          </div>
          <p>{t("Live MapleStory. Sharp guides. Real progression.")}</p>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <h3>{t(group.title)}</h3>
            <ul>
              {group.links.map((link) => (
                <li key={link.href}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container site-footer__bottom">
        <span>
          {t("Contact")}: <a href={`mailto:${businessEmail}`}>{businessEmail}</a>
        </span>
        <span>{t("© 2026 SNAILSLAYER")}</span>
      </div>
    </footer>
  );
}
