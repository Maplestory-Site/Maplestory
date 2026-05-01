import { useEffect } from "react";

export function ComingSoonPage() {
  useEffect(() => {
    document.documentElement.classList.add("coming-soon-active");
    return () => {
      document.documentElement.classList.remove("coming-soon-active");
    };
  }, []);

  return (
    <main className="coming-soon-page" aria-labelledby="coming-soon-title">
      <video className="coming-soon-video" autoPlay muted loop playsInline preload="auto">
        <source src="/videos/maplestory-moonflower-hill.mp4" type="video/mp4" />
      </video>

      <div className="coming-soon-overlay" aria-hidden="true" />
      <div className="coming-soon-vignette" aria-hidden="true" />

      <section className="coming-soon-content" aria-label="Coming soon">
        <p className="coming-soon-eyebrow">Snailslayer presents</p>
        <h1 id="coming-soon-title">COMING SOON</h1>
        <p className="coming-soon-subtitle">We&apos;re building something epic.</p>
        <p className="coming-soon-note">IdleStory + Maple Library experience</p>
        <div className="coming-soon-status" aria-label="Development in progress">
          <span aria-hidden="true" />
          Development in progress
        </div>
      </section>
    </main>
  );
}
