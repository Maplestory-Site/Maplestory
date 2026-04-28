import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { footerGroups, headerActions, navigationItems, secondaryNavigationItems, socialLinks } from "../../data/siteContent";
import { twitchLiveStatus } from "../../data/twitchFeed";
import { Footer } from "./Footer";
import { Header } from "../navigation/Header";
import { MobileMenu } from "../navigation/MobileMenu";
import { MockAuthProvider } from "../../features/profile/MockAuthContext";
import { AuthModal } from "./AuthModal";
import { GoogleAnalytics } from "../analytics/GoogleAnalytics";

function RootLayoutContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let observer: IntersectionObserver | undefined;
    let mutationObserver: MutationObserver | undefined;
    let frame = 0;

    const isInViewport = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    };

    const prepareRevealItem = (item: HTMLElement) => {
      if (reducedMotion) {
        item.classList.add("is-visible");
        return;
      }

      item.classList.remove("is-visible");

      if (isInViewport(item)) {
        item.classList.add("is-visible");
        return;
      }

      observer?.observe(item);
    };

    frame = window.requestAnimationFrame(() => {
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

      const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
      revealItems.forEach((item) => {
        prepareRevealItem(item);
      });

      const mainContent = document.getElementById("main-content");
      mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) {
              return;
            }

            if (node.matches("[data-reveal]")) {
              prepareRevealItem(node);
            }

            node.querySelectorAll<HTMLElement>("[data-reveal]").forEach((item) => {
              prepareRevealItem(item);
            });
          });
        });
      });

      mutationObserver.observe(mainContent ?? document.body, {
        childList: true,
        subtree: true
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      mutationObserver?.disconnect();
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
        onOpenMenu={() => setMobileMenuOpen(true)}
        primaryCta={headerActions.primary}
      />
      <MobileMenu
        navItems={navigationItems}
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        primaryCta={headerActions.primary}
        utilityItems={secondaryNavigationItems}
        socialLinks={socialLinks}
      />
      <main id="main-content">
        <Outlet />
      </main>
      <GoogleAnalytics />
      <AuthModal />
      <Footer groups={footerGroups} />
    </div>
  );
}

export function RootLayout() {
  return (
    <MockAuthProvider>
      <RootLayoutContent />
    </MockAuthProvider>
  );
}
