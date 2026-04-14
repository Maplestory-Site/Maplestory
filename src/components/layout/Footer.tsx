import { NavLink } from "react-router-dom";
import { businessEmail, socialLinks, type NavItem } from "../../data/siteContent";
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
      <div className="container site-footer__shell">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <div className="site-footer__brand-head">
              <span className="brand-lockup__mark brand-lockup__mark--image brand-lockup__mark--footer">
                <img alt="SNAILSLAYER logo" decoding="async" loading="lazy" src="/snailslayer-logo.jpeg" />
              </span>
              <div className="site-footer__brand-copy">
                <strong>SNAILSLAYER</strong>
                <span>{t("MapleStory Creator")}</span>
              </div>
            </div>

            <p>{t("Clean guides, live runs, and sharper MapleStory progression in one place.")}</p>

            <div className="site-footer__brand-meta">
              <span>{t("Premium Maple platform")}</span>
              <span>{t("Europe / Global")}</span>
            </div>
          </div>

          {groups.map((group) => (
            <section className="site-footer__section" key={group.title}>
              <h3>{t(group.title)}</h3>
              <ul className="site-footer__links">
                {group.links.map((link) => (
                  <li key={link.href}>{renderLink(link)}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__bottom-copy">
            <span>{t("© 2026 SNAILSLAYER")}</span>
            <span>{t("Made for players who want cleaner clears and better calls.")}</span>
          </div>

          <div className="site-footer__bottom-meta">
            <a href={`mailto:${businessEmail}`}>{businessEmail}</a>

            <div className="site-footer__socials">
              {socialLinks.map((item) => {
                const isExternal = /^(https?:\/\/|mailto:)/.test(item.href);
                const label = t(item.platform);

                if (isExternal) {
                  return (
                    <a
                      aria-label={label}
                      className="site-footer__social-link"
                      href={item.href}
                      key={item.platform}
                      rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                    >
                      {label.slice(0, 2).toUpperCase()}
                    </a>
                  );
                }

                return (
                  <NavLink aria-label={label} className="site-footer__social-link" key={item.platform} to={item.href}>
                    {label.slice(0, 2).toUpperCase()}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
