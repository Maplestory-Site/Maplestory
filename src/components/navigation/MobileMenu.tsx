import { NavLink } from "react-router-dom";
import type { NavItem, SocialItem } from "../../data/siteContent";
import { Button } from "../ui/Button";

type MobileMenuProps = {
  open: boolean;
  navItems: NavItem[];
  utilityItems?: NavItem[];
  socialLinks: SocialItem[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  onClose: () => void;
};

export function MobileMenu({
  open,
  navItems,
  utilityItems = [],
  socialLinks,
  primaryCta,
  secondaryCta,
  onClose
}: MobileMenuProps) {
  function renderSocialLink(platform: SocialItem) {
    const isExternal = /^https?:\/\//.test(platform.href);

    if (isExternal) {
      return (
        <a className="mobile-menu__social-link" href={platform.href} key={platform.platform} rel="noreferrer" target="_blank">
          {platform.platform}
        </a>
      );
    }

    return (
      <NavLink className="mobile-menu__social-link" key={platform.platform} onClick={onClose} to={platform.href}>
        {platform.platform}
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
            <p>Premium creator hub</p>
            </div>
          </div>
          <button aria-label="Close menu" className="mobile-menu__close" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="mobile-menu__actions">
          <Button fullWidth href={primaryCta.href}>{primaryCta.label}</Button>
          <Button fullWidth href={secondaryCta.href} variant="secondary">{secondaryCta.label}</Button>
        </div>

        <nav aria-label="Mobile" className="mobile-menu__nav">
          {navItems.map((item) => (
            <NavLink className="mobile-menu__link" key={item.href} onClick={onClose} to={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {utilityItems.length ? (
          <div className="mobile-menu__utility">
            {utilityItems.map((item) => (
              <NavLink className="mobile-menu__utility-link" key={item.href} onClick={onClose} to={item.href}>
                {item.label}
              </NavLink>
            ))}
          </div>
        ) : null}

        <div className="mobile-menu__socials">
          <span>Watch</span>
          {socialLinks.map((item) => renderSocialLink(item))}
        </div>
      </div>
    </div>
  );
}
