import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { footerGroups, headerActions, navigationItems, secondaryNavigationItems, socialLinks } from "../../data/siteContent";
import { twitchLiveStatus } from "../../data/twitchFeed";
import { Footer } from "./Footer";
import { Header } from "../navigation/Header";
import { MobileMenu } from "../navigation/MobileMenu";
import { MockAuthProvider } from "../../features/profile/MockAuthContext";
import { AuthModal } from "./AuthModal";

function RootLayoutContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let observer: IntersectionObserver | undefined;
    let frame = 0;

    const isInViewport = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    };

    frame = window.requestAnimationFrame(() => {
      const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
      if (!revealItems.length) {
        return;
      }

      if (reducedMotion) {
        revealItems.forEach((item) => item.classList.add("is-visible"));
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add("is-visible");
            observer?.unobserve(entry.target);
          });
        },
        {
          rootMargin: "0px 0px -10% 0px",
          threshold: 0.14
        }
      );

      revealItems.forEach((item) => {
        item.classList.remove("is-visible");

        if (isInViewport(item)) {
          item.classList.add("is-visible");
          return;
        }

        observer?.observe(item);
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header
        liveStatus={twitchLiveStatus}
        navItems={navigationItems}
        utilityItems={secondaryNavigationItems}
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
        utilityItems={secondaryNavigationItems}
        socialLinks={socialLinks}
      />
      <main id="main-content">
        <Outlet />
      </main>
      <AuthModal />
      <Footer groups={footerGroups} />
    </div>
  );
}

export function RootLayout() {
  return (
    <MockAuthProvider>
      <RootLayoutContent />
      <Analytics />
    </MockAuthProvider>
  );
}
