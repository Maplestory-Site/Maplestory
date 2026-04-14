import { NavLink } from "react-router-dom";
import type { NavItem, SocialItem } from "../../data/siteContent";
import { Button } from "../ui/Button";
import { useI18n } from "../../i18n/I18nProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useMockAuth } from "../../features/profile/MockAuthContext";

type MobileMenuProps = {
  open: boolean;
  navItems: NavItem[];
  utilityItems?: NavItem[];
  socialLinks: SocialItem[];
  primaryCta: { label: string; href: string };
  onClose: () => void;
};

export function MobileMenu({
  open,
  navItems,
  utilityItems = [],
  socialLinks,
  primaryCta,
  onClose
}: MobileMenuProps) {
  const { t } = useI18n();
  const { user, isAuthenticated, openAuth, logout } = useMockAuth();

  function renderSocialLink(platform: SocialItem) {
    const isExternal = /^https?:\/\//.test(platform.href);

    if (isExternal) {
      return (
        <a className="mobile-menu__social-link" href={platform.href} key={platform.platform} rel="noreferrer" target="_blank">
          {t(platform.platform)}
        </a>
      );
    }

    return (
      <NavLink className="mobile-menu__social-link" key={platform.platform} onClick={onClose} to={platform.href}>
        {t(platform.platform)}
      </NavLink>
    );
  }

  return (
    <div aria-hidden={!open} className={`mobile-menu ${open ? "is-open" : ""}`}>
      <div className="mobile-menu__panel">
        <div className="mobile-menu__top">
          <div className="mobile-menu__brand">
            <span className="brand-lockup__mark brand-lockup__mark--image brand-lockup__mark--mobile">
              <img alt="SNAILSLAYER logo" src="/snailslayer-logo.jpeg" />
            </span>
            <div>
            <strong>SNAILSLAYER</strong>
            <p>{t("MapleStory Creator")}</p>
            </div>
          </div>
          <button aria-label={t("Close")} className="mobile-menu__close" onClick={onClose} type="button">
            {t("Close")}
          </button>
        </div>

        <div className="mobile-menu__body">
          {isAuthenticated && user ? (
            <div className="mobile-menu__profile-badge">
              <span>{user.username.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{user.username}</strong>
                <button className="site-header__user-action" type="button" onClick={logout}>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="mobile-menu__auth">
              <button className="site-header__login" type="button" onClick={openAuth}>
                Login
              </button>
            </div>
          )}

          <nav aria-label="Mobile" className="mobile-menu__nav">
            {navItems.map((item) =>
              item.children?.length ? (
                <div className="mobile-menu__group" key={item.label}>
                  <NavLink className="mobile-menu__link" onClick={onClose} to={item.href}>
                    {t(item.label)}
                  </NavLink>
                  <div className="mobile-menu__sublinks">
                    {item.children.map((child) => (
                      <NavLink className="mobile-menu__sublink" key={child.href} onClick={onClose} to={child.href}>
                        {t(child.label)}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ) : (
                <NavLink className="mobile-menu__link" key={item.href} onClick={onClose} to={item.href}>
                  {t(item.label)}
                </NavLink>
              )
            )}
          </nav>

          <div className="mobile-menu__secondary">
            <div className="mobile-menu__language">
              <span className="mobile-menu__label">{t("Language")}</span>
              <LanguageSwitcher compact />
            </div>

            {utilityItems.length ? (
              <div className="mobile-menu__utility">
                {utilityItems.map((item) => (
                  <NavLink className="mobile-menu__utility-link" key={item.href} onClick={onClose} to={item.href}>
                    {t(item.label)}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mobile-menu__footer">
            <div className="mobile-menu__actions">
              <Button fullWidth href={primaryCta.href}>{t(primaryCta.label)}</Button>
            </div>

            <div className="mobile-menu__socials">
              <span>{t("Watch Live")}</span>
              {socialLinks.map((item) => renderSocialLink(item))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
