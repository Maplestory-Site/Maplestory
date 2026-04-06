import { NavLink } from "react-router-dom";
import type { NavItem } from "../../data/siteContent";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

type HeaderProps = {
  navItems: NavItem[];
  onOpenMenu: () => void;
  liveStatus?: "live" | "offline" | "soon";
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export function Header({ navItems, onOpenMenu, liveStatus = "offline", primaryCta, secondaryCta }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink aria-label="SNAILSLAYER home" className="brand-lockup" to="/">
          <span className="brand-lockup__mark brand-lockup__mark--image">
            <img alt="SNAILSLAYER logo" src="/snailslayer-logo.jpeg" />
          </span>
          <span className="brand-lockup__copy">
            <strong>SNAILSLAYER</strong>
            <small>MapleStory | Live | Guides</small>
          </span>
        </NavLink>

        <nav aria-label="Primary" className="site-nav">
          {navItems.map((item) => (
            <NavLink className={({ isActive }) => `site-nav__link ${isActive ? "is-active" : ""}`} key={item.href} to={item.href}>
              {item.label}
              {item.label === "Live" && liveStatus === "live" ? <Badge label="Live" tone="live" /> : null}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
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
