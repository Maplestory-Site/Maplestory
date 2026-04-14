import { NavLink, Link, useLocation } from "react-router-dom";
import type { NavItem } from "../../data/siteContent";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "../../i18n/I18nProvider";
import { useMockAuth } from "../../features/profile/MockAuthContext";

type HeaderProps = {
  navItems: NavItem[];
  onOpenMenu: () => void;
  liveStatus?: "live" | "offline" | "soon";
  primaryCta: { label: string; href: string };
};

export function Header({
  navItems,
  onOpenMenu,
  liveStatus = "offline",
  primaryCta
}: HeaderProps) {
  const location = useLocation();
  const { t } = useI18n();
  const { user, isAuthenticated, openAuth, logout } = useMockAuth();

  function isDatabaseItem(item: NavItem) {
    return item.href === "/database/monster";
  }

  function isActiveNavItem(item: NavItem) {
    if (isDatabaseItem(item)) {
      return location.pathname.startsWith("/database/");
    }

    return location.pathname === item.href;
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand-lockup site-header__brand" to="/">
          <span className="brand-lockup__mark brand-lockup__mark--image">
            <img alt="SNAILSLAYER logo" src="/snailslayer-logo.jpeg" />
          </span>
          <span className="brand-lockup__copy">
            <strong>SNAILSLAYER</strong>
            <small>{t("MapleStory Creator")}</small>
          </span>
        </Link>

        <div className="site-header__center">
          <nav aria-label="Primary" className="site-nav">
            {navItems.map((item) =>
              item.children?.length ? (
                <div className="site-nav__item site-nav__item--has-children" key={item.label}>
                  <NavLink className={`site-nav__link ${isActiveNavItem(item) ? "is-active" : ""}`} to={item.href}>
                    {t(item.label)}
                  </NavLink>
                  <div className="site-nav__submenu">
                    {item.children.map((child) => (
                      <NavLink
                        className={({ isActive }) => `site-nav__submenu-link ${isActive ? "is-active" : ""}`}
                        key={child.href}
                        to={child.href}
                      >
                        {t(child.label)}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ) : (
                <NavLink className={({ isActive }) => `site-nav__link ${isActive ? "is-active" : ""}`} key={item.href} to={item.href}>
                  {t(item.label)}
                  {item.label === "Live" && liveStatus === "live" ? <Badge label={t("Live")} tone="live" /> : null}
                </NavLink>
              )
            )}
          </nav>
        </div>

        <div className="site-header__actions">
          <div className="site-header__account">
            {isAuthenticated && user ? (
              <div className="site-header__user">
                <span>{user.username}</span>
                <button className="site-header__user-action" type="button" onClick={logout}>
                  Logout
                </button>
              </div>
            ) : (
              <button className="site-header__login" type="button" onClick={openAuth}>
                Login
              </button>
            )}
          </div>

          <div className="site-header__cta-group">
            <LanguageSwitcher />
            <Button href={primaryCta.href} size="sm">{t(primaryCta.label)}</Button>
          </div>

          <button aria-label={t("Open menu")} className="menu-trigger" onClick={onOpenMenu} type="button">
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
