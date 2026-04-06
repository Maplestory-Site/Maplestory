import { useState } from "react";
import { Outlet } from "react-router-dom";
import { footerGroups, headerActions, navigationItems, socialLinks } from "../../data/siteContent";
import { twitchLiveStatus } from "../../data/twitchFeed";
import { Footer } from "./Footer";
import { Header } from "../navigation/Header";
import { MobileMenu } from "../navigation/MobileMenu";
import { BackgroundAudioPlayer } from "./BackgroundAudioPlayer";

export function RootLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header
        liveStatus={twitchLiveStatus}
        navItems={navigationItems}
        onOpenMenu={() => setMobileMenuOpen(true)}
        primaryCta={headerActions.primary}
        secondaryCta={headerActions.secondary}
      />
      <MobileMenu
        navItems={navigationItems}
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        primaryCta={headerActions.primary}
        secondaryCta={headerActions.secondary}
        socialLinks={socialLinks}
      />
      <main id="main-content">
        <Outlet />
      </main>
      <BackgroundAudioPlayer />
      <Footer groups={footerGroups} />
    </div>
  );
}
