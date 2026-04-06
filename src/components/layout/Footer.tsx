import { NavLink } from "react-router-dom";
import { businessEmail, type NavItem } from "../../data/siteContent";

type FooterGroup = {
  title: string;
  links: NavItem[];
};

type FooterProps = {
  groups: FooterGroup[];
};

export function Footer({ groups }: FooterProps) {
  function renderLink(link: NavItem) {
    const isExternal = /^https?:\/\//.test(link.href);

    if (isExternal) {
      return (
        <a href={link.href} rel="noreferrer" target="_blank">
          {link.label}
        </a>
      );
    }

    return <NavLink to={link.href}>{link.label}</NavLink>;
  }

  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <div className="site-footer__brand-head">
            <span className="brand-lockup__mark brand-lockup__mark--image brand-lockup__mark--footer">
              <img alt="SNAILSLAYER logo" src="/snailslayer-logo.jpeg" />
            </span>
            <strong>SNAILSLAYER</strong>
          </div>
          <p>MapleStory content focused on bossing, progression, and live community-driven coverage.</p>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <h3>{group.title}</h3>
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
          Contact email: <a href={`mailto:${businessEmail}`}>{businessEmail}</a>
        </span>
        <span>© 2026 SNAILSLAYER</span>
      </div>
    </footer>
  );
}
