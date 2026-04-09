import { useMemo, useState } from "react";
import { usePageMeta } from "../app/usePageMeta";
import { AboutBlock } from "../components/content/AboutBlock";
import { ContentFilterBar } from "../components/content/ContentFilterBar";
import { HeroBlock } from "../components/content/HeroBlock";
import { HighlightCard } from "../components/content/HighlightCard";
import { MiniGamesLauncher } from "../components/content/MiniGamesLauncher";
import { SocialLinkCard } from "../components/content/SocialLinkCard";
import { StreamStatusCard } from "../components/content/StreamStatusCard";
import { VideoCard } from "../components/content/VideoCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { socialLinks, streamDetails } from "../data/siteContent";
import {
  twitchChannelUrl,
  twitchGameName,
  twitchLiveStatus,
  twitchStreamTitle,
  twitchViewerCount
} from "../data/twitchFeed";
import { youtubeVideos } from "../data/youtubeFeed";
import { contentFilters, filterVideos, inferPrimaryCategory, type ContentFilterKey } from "../lib/contentDiscovery";

export function HomePage() {
  usePageMeta("Home", "MapleStory live streams, sharp guides, bossing, and progression content from SNAILSLAYER.");
  const [activeFilter, setActiveFilter] = useState<ContentFilterKey>("all");

  const isLive = twitchLiveStatus === "live";
  const filterCounts = useMemo(
    () =>
      youtubeVideos.reduce<Record<ContentFilterKey, number>>(
        (counts, item) => {
          counts.all += 1;
          counts[inferPrimaryCategory(item)] += 1;
          return counts;
        },
        { all: 0, boss: 0, guide: 0, funny: 0, progression: 0 }
      ),
    []
  );

  const homeFilteredVideos = useMemo(() => filterVideos(youtubeVideos, activeFilter), [activeFilter]);

  const featuredUpload = homeFilteredVideos[0] ?? youtubeVideos[0];
  const secondaryVideos = (homeFilteredVideos.length > 1 ? homeFilteredVideos : youtubeVideos).slice(1, 3);
  const clipOfDay = homeFilteredVideos[2] ?? homeFilteredVideos[0] ?? youtubeVideos[2] ?? youtubeVideos[0];
  const clipFeed = (homeFilteredVideos.length > 3 ? homeFilteredVideos : youtubeVideos).slice(3, 6).map((item, index) => ({
    href: item.href,
    duration: item.duration,
    featured: index === 0,
    label: index === 0 ? "Clip of the Day" : index === 1 ? "Boss Fight" : "Progression",
    note: index === 0 ? "Fast payoff. Zero filler." : index === 1 ? "One clean run worth replaying." : "The moment the route changed.",
    thumbnail: item.thumbnail,
    title: item.title,
    ctaLabel: index === 0 ? "Watch Clip" : "Play Clip"
  }));

  const liveCardDetails = {
    ...streamDetails,
    status: twitchLiveStatus as "live" | "offline",
    title: isLive ? "Live now on Twitch" : "Next stream starts here",
    description: isLive
      ? `SNAILSLAYER is live on ${twitchGameName}. Jump in for bossing, account calls, and real-time MapleStory decisions.`
      : "Offline right now. The next stream is where the clean clears, real calls, and best breakdowns happen.",
    viewerCount: twitchViewerCount,
    streamTitle: twitchStreamTitle || "Bossing, progression, and live MapleStory calls",
    primaryCta: { label: "Watch Live", href: twitchChannelUrl },
    secondaryCta: { label: "Get Alerts", href: "/community" },
    lastStreamLabel: "Last upload",
    lastStreamTitle: featuredUpload?.title || "Catch the latest run",
    lastStreamHref: featuredUpload?.href || "/videos"
  };

  return (
    <>
      <HeroBlock
        description="Bossing, progression, and live MapleStory content that gets to the point."
        eyebrow="SNAILSLAYER | Live bossing | Sharp guides"
        featuredDescription="Live runs, fresh uploads, and the Discord that keeps you in the loop."
        featuredTitle="Everything worth watching starts here."
        statusLabel={isLive ? "LIVE NOW" : "OFFLINE NOW"}
        statusTone={isLive ? "live" : "offline"}
        title="Clean clears. Sharp calls."
        urgencyText={isLive ? "Live now. Get in before the run ends." : "Next push starts soon. Get the ping first."}
      />

      <section className="section" data-reveal>
        <div className="container two-column">
          <div className="stream-copy-panel card home-live-copy">
            <SectionHeader
              description={isLive ? "Boss attempts, sharp calls, and real-time MapleStory talk." : "The fastest way back in: next stream, last upload, and one fresh clip."}
              eyebrow="Live"
              title={isLive ? "Watch the run live" : "Don't miss the next stream"}
            />
            <div className="home-live-notes">
              <article className="card home-mini-card">
                <span className="home-mini-card__eyebrow">Clip of the Day</span>
                <strong>{clipOfDay?.title || "Best recent MapleStory moment"}</strong>
                <a className="home-mini-card__link" href={clipOfDay?.href || "/videos"}>Watch Clip</a>
              </article>
              <article className="card home-mini-card">
                <span className="home-mini-card__eyebrow">Latest Upload</span>
                <strong>{featuredUpload?.title || "Fresh upload ready now"}</strong>
                <a className="home-mini-card__link" href="/videos">See New Videos</a>
              </article>
            </div>
          </div>
          <StreamStatusCard {...liveCardDetails} />
        </div>
      </section>

      <section className="section section--tight" data-reveal>
        <div className="container">
          <MiniGamesLauncher />
        </div>
      </section>

      <section className="section section--tight" data-reveal>
        <div className="container">
          <div className="clip-day-hero card">
            <div className="clip-day-hero__media">
              {clipOfDay?.thumbnail ? <img alt="" decoding="async" loading="lazy" src={clipOfDay.thumbnail} /> : null}
              <span className="clip-day-hero__badge">Clip of the Day</span>
              <span className="clip-day-hero__play">Play</span>
            </div>
            <div className="clip-day-hero__copy">
              <span className="section-header__eyebrow">Today's Fast Watch</span>
              <h2>{clipOfDay?.title || "Best recent MapleStory moment"}</h2>
              <p>One strong moment. One quick click.</p>
              <div className="clip-day-hero__meta">
                <span>{clipOfDay?.duration || "Short clip"}</span>
                <span>High replay value</span>
              </div>
              <div className="clip-day-hero__actions">
                <a className="button button--primary" href={clipOfDay?.href || "/videos"}>Watch Clip</a>
                <a className="button button--secondary" href="/videos">More Clips</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight" data-reveal>
        <div className="container">
          <SectionHeader
            description="Three reasons to check back every day."
            eyebrow="Return Daily"
            title="Always something new waiting"
          />
          <div className="home-return-grid">
            <article className="card home-return-card home-return-card--highlight">
              <span className="home-return-card__eyebrow">Clip of the Day</span>
              <strong>{clipOfDay?.title || "One fast moment worth the click"}</strong>
              <p>Quick payoff. Easy replay.</p>
              <a className="button button--secondary" href={clipOfDay?.href || "/videos"}>Watch Today's Clip</a>
            </article>

            <article className="card home-return-card home-return-card--upload">
              <span className="home-return-card__eyebrow">Latest Upload</span>
              <strong>{featuredUpload?.title || "Fresh upload ready now"}</strong>
              <p>New guide, new run, or new account call.</p>
              <a className="button button--ghost" href="/videos">See Latest Upload</a>
            </article>

          </div>
        </div>
      </section>

      <section className="section" data-reveal>
        <div className="container">
          <SectionHeader
            action={{ label: "See New Videos", href: "/videos" }}
            description={activeFilter === "all" ? "Full uploads, quick picks, and one featured clip." : `Fast picks from ${contentFilters.find((filter) => filter.key === activeFilter)?.label.toLowerCase()}.`}
            eyebrow="Videos"
            title={activeFilter === "all" ? "Watch the best part first" : `${contentFilters.find((filter) => filter.key === activeFilter)?.label} first`}
          />
          <ContentFilterBar activeFilter={activeFilter} counts={filterCounts} filters={contentFilters} onChange={setActiveFilter} />
          <div className="home-featured-grid">
            <div className="home-featured-grid__lead">
              {featuredUpload ? <VideoCard item={{ ...featuredUpload, featured: true }} /> : null}
            </div>
            <div className="home-featured-grid__stack">
              {secondaryVideos.map((item) => (
                <VideoCard item={item} key={item.id} />
              ))}
            </div>
            <article className="card featured-moment-card">
              <span className="section-header__eyebrow">Featured Clip</span>
              <h3>Clip of the day</h3>
              <p>One quick moment worth the click.</p>
              <strong>{clipOfDay?.title || "Best recent MapleStory moment"}</strong>
              <div className="featured-moment-card__stats">
                <span>Fast watch</span>
                <span>High replay value</span>
              </div>
              <a className="button button--secondary button--full" href={clipOfDay?.href || "/videos"}>Watch Clip</a>
            </article>
          </div>
          <div className="home-clip-grid">
            {clipFeed.map((item) => (
              <HighlightCard item={item} key={`${item.href}-${item.label}`} />
            ))}
          </div>
        </div>
      </section>

        <section className="section" data-reveal>
          <div className="container home-community">
            <div className="card home-community__main home-community__main--discord">
              <span className="section-header__eyebrow">Community</span>
              <h2>Get the ping before everyone else</h2>
              <p>Discord is where the next stream, next upload, and fastest answers land first.</p>
              <div className="home-community__proof">
                <span>Live every week</span>
                <span>Fresh drops first</span>
                <span>Community active daily</span>
              </div>
              <div className="home-community__benefits">
                <span>Live alerts first</span>
                <span>Ask for help fast</span>
                <span>Patch talk that matters</span>
              </div>
              <strong className="home-community__urgency">Miss Discord, miss the update.</strong>
              <div className="home-community__actions">
                <a className="button button--primary" href="/community">Join Discord First</a>
                <a className="button button--secondary" href="/live">Watch Live</a>
              </div>
            </div>
          <div className="home-community__side">
            {socialLinks
              .filter((item) => item.platform === "Telegram" || item.platform === "YouTube")
              .map((item) => (
                <SocialLinkCard item={item} key={item.platform} />
              ))}
          </div>
        </div>
      </section>

      <AboutBlock
        cta={{ label: "About SNAILSLAYER", href: "/about" }}
        description="I go deep, keep it honest, and stay open when the community needs real help."
        points={["Reliable info", "Real opinion", "Open help"]}
        title="Why people stay"
      />
    </>
  );
}
