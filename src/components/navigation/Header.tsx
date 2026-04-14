import { NavLink, useLocation } from "react-router-dom";
import type { NavItem } from "../../data/siteContent";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "../../i18n/I18nProvider";
import { useGameMeta } from "../content/minigames/shared/useGameMeta";
import { getProgressSnapshot } from "../content/minigames/shared/gameMeta";
import { useMockAuth } from "../../features/profile/MockAuthContext";
import { useEffect, useState } from "react";

type HeaderProps = {
  navItems: NavItem[];
  utilityItems?: NavItem[];
  onOpenMenu: () => void;
  liveStatus?: "live" | "offline" | "soon";
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export function Header({
  navItems,
  utilityItems = [],
  onOpenMenu,
  liveStatus = "offline",
  primaryCta,
  secondaryCta
}: HeaderProps) {
  const location = useLocation();
  const { t } = useI18n();
  const meta = useGameMeta();
  const progress = getProgressSnapshot(meta);
  const { user, isAuthenticated, openAuth, logout } = useMockAuth();
  const [showCoinGain, setShowCoinGain] = useState(false);

  useEffect(() => {
    if (!meta.lastCoinAt || meta.lastCoinGain <= 0) return;
    const timeAgo = Date.now() - new Date(meta.lastCoinAt).getTime();
    if (timeAgo > 8000) return;
    setShowCoinGain(true);
    const timer = window.setTimeout(() => setShowCoinGain(false), 2000);
    return () => window.clearTimeout(timer);
  }, [meta.lastCoinAt, meta.lastCoinGain]);

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

        <div className="site-header__actions">
          <div className="site-header__utility">
            {utilityItems.map((item) => (
              <NavLink className={({ isActive }) => `site-header__utility-link ${isActive ? "is-active" : ""}`} key={item.href} to={item.href}>
                {t(item.label)}
              </NavLink>
            ))}
          </div>
          <div className="site-header__level">
            <span>Level {progress.level}</span>
            <div className="site-header__level-bar">
              <span style={{ width: `${progress.progress}%` }} />
            </div>
          </div>
          <div className={`site-header__coins ${showCoinGain ? "is-gaining" : ""}`}>
            <span>Coins</span>
            <strong>{meta.coins}</strong>
            {showCoinGain ? <em className="site-header__coins-gain">+{meta.lastCoinGain}</em> : null}
          </div>
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
          <LanguageSwitcher />
          <Button href={secondaryCta.href} size="sm" variant="secondary">{t(secondaryCta.label)}</Button>
          <Button href={primaryCta.href} size="sm">{t(primaryCta.label)}</Button>
          <button aria-label={t("Open menu")} className="menu-trigger" onClick={onOpenMenu} type="button">
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
