import { NavLink, Link, useLocation } from "react-router-dom";
import type { NavItem } from "../../data/siteContent";
import { Button } from "../ui/Button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "../../i18n/I18nProvider";
import { useMockAuth } from "../../features/profile/MockAuthContext";

type HeaderProps = {
  navItems: NavItem[];
  onOpenMenu: () => void;
  liveStatus?: "live" | "offline" | "soon";
  primaryCta: { label: string; href: string };
};

const PRIMARY_NAV_LABELS = new Set(["Home", "News", "Library", "Games"]);
const SECONDARY_NAV_LABELS = new Set(["Classes", "Videos", "Community", "DataBase"]);

export function Header({
  navItems,
  onOpenMenu,
  liveStatus = "offline",
  primaryCta
}: HeaderProps) {
  const location = useLocation();
  const { t } = useI18n();
  const { user, isAuthenticated, openAuth, logout } = useMockAuth();
  const primaryNavItems = navItems.filter((item) => PRIMARY_NAV_LABELS.has(item.label));
  const moreNavItems = navItems.filter((item) => SECONDARY_NAV_LABELS.has(item.label));

  function isDatabaseItem(item: NavItem) {
    return item.href === "/database/monster";
  }

  function isActiveNavItem(item: NavItem) {
    if (isDatabaseItem(item)) {
      return location.pathname.startsWith("/database/");
    }

    return location.pathname === item.href;
  }

  const isMoreActive = moreNavItems.some((item) => isActiveNavItem(item));

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
            {primaryNavItems.map((item) => (
              <NavLink className={({ isActive }) => `site-nav__link ${isActive ? "is-active" : ""}`} key={item.href} to={item.href}>
                {t(item.label)}
              </NavLink>
            ))}

            {moreNavItems.length ? (
              <div className={`site-nav__item site-nav__item--has-children site-nav__item--more ${isMoreActive ? "is-active" : ""}`}>
                <button
                  aria-haspopup="menu"
                  className={`site-nav__link site-nav__more-button ${isMoreActive ? "is-active" : ""}`}
                  type="button"
                >
                  {t("More")}
                  <span aria-hidden="true" className="site-nav__chevron" />
                </button>

                <div className="site-nav__submenu site-nav__submenu--more" role="menu">
                  {moreNavItems.map((item) => (
                    <div className="site-nav__submenu-group" key={item.label}>
                      <NavLink
                        className={({ isActive }) => `site-nav__submenu-link ${isActive || isActiveNavItem(item) ? "is-active" : ""}`}
                        role="menuitem"
                        to={item.href}
                      >
                        {t(item.label)}
                      </NavLink>

                      {item.children?.length ? (
                        <div className="site-nav__submenu-children">
                          {item.children.map((child) => (
                            <NavLink
                              className={({ isActive }) => `site-nav__submenu-link ${isActive ? "is-active" : ""}`}
                              key={child.href}
                              role="menuitem"
                              to={child.href}
                            >
                              {t(child.label)}
                            </NavLink>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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

          <div className="site-header__cta-group" data-live-status={liveStatus}>
            <LanguageSwitcher />
            <Button href={primaryCta.href} size="sm">
              {t(primaryCta.label)}
            </Button>
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
