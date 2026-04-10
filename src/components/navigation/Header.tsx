import { NavLink, useLocation } from "react-router-dom";
import type { NavItem } from "../../data/siteContent";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

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

  function isDatabaseItem(item: NavItem) {
    return item.label === "DataBase";
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
                  {item.label}
                </NavLink>
                <div className="site-nav__submenu">
                  {item.children.map((child) => (
                    <NavLink
                      className={({ isActive }) => `site-nav__submenu-link ${isActive ? "is-active" : ""}`}
                      key={child.href}
                      to={child.href}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink className={({ isActive }) => `site-nav__link ${isActive ? "is-active" : ""}`} key={item.href} to={item.href}>
                {item.label}
                {item.label === "Live" && liveStatus === "live" ? <Badge label="Live" tone="live" /> : null}
              </NavLink>
            )
          )}
        </nav>

        <div className="site-header__actions">
          <div className="site-header__utility">
            {utilityItems.map((item) => (
              <NavLink className={({ isActive }) => `site-header__utility-link ${isActive ? "is-active" : ""}`} key={item.href} to={item.href}>
                {item.label}
              </NavLink>
            ))}
          </div>
          <Button href={secondaryCta.href} size="sm" variant="secondary">{secondaryCta.label}</Button>
          <Button href={primaryCta.href} size="sm">{primaryCta.label}</Button>
          <button aria-label="Open menu" className="menu-trigger" onClick={onOpenMenu} type="button">
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
