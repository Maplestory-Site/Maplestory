import { useMemo, useState } from "react";
import { usePageMeta } from "../app/usePageMeta";
import { AboutBlock } from "../components/content/AboutBlock";
import { ContentFilterBar } from "../components/content/ContentFilterBar";
import { HeroBlock } from "../components/content/HeroBlock";
import { HighlightCard } from "../components/content/HighlightCard";
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
import { useI18n } from "../i18n/I18nProvider";

export function HomePage() {
  const { t } = useI18n();
  usePageMeta(t("Home"), t("MapleStory live streams, sharp guides, bossing, and progression content from SNAILSLAYER."));
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
    label: index === 0 ? t("Clip of the Day") : index === 1 ? t("Boss Fight") : t("Progression"),
    note: index === 0 ? t("Fast payoff. Zero filler.") : index === 1 ? t("One clean run worth replaying.") : t("The moment the route changed."),
    thumbnail: item.thumbnail,
    title: item.title,
    ctaLabel: index === 0 ? t("Watch Clip") : t("Play Clip")
  }));

  const liveCardDetails = {
    ...streamDetails,
    status: twitchLiveStatus as "live" | "offline",
    title: isLive ? "Live now on Twitch" : "Next stream starts here",
    description: isLive
      ? t(`SNAILSLAYER is live on ${twitchGameName}. Jump in for bossing, account calls, and real-time MapleStory decisions.`)
      : t("Offline right now. The next stream is where the clean clears, real calls, and best breakdowns happen."),
    viewerCount: twitchViewerCount,
    streamTitle: twitchStreamTitle || t("Bossing, progression, and live MapleStory calls"),
    primaryCta: { label: t("Watch Live"), href: twitchChannelUrl },
    secondaryCta: { label: t("Get Alerts"), href: "/community" },
    lastStreamLabel: t("Last upload"),
    lastStreamTitle: featuredUpload?.title || t("Catch the latest run"),
    lastStreamHref: featuredUpload?.href || "/videos"
  };

  return (
    <>
        <HeroBlock
          description={t("Watch smarter runs, better boss calls, and the drops worth coming back for.")}
          eyebrow={t("SNAILSLAYER | Live bossing | Sharp guides")}
          featuredDescription={t("Follow once and stay close to every live run, new upload, and next alert.")}
          featuredTitle={t("Watch better. Follow earlier.")}
          statusLabel={isLive ? t("LIVE NOW") : t("OFFLINE NOW")}
          statusTone={isLive ? "live" : "offline"}
          title={t("Clean clears. Sharp calls.")}
          valueLine={t("Best bossing strategies that pay off.")}
          urgencyText={isLive ? t("Live now. Get in before the run ends.") : t("Next push starts soon. Get the ping first.")}
        />

      <section className="section" data-reveal>
        <div className="container two-column">
          <div className="stream-copy-panel card home-live-copy">
            <SectionHeader
              description={isLive ? t("Boss attempts, sharp calls, and real-time MapleStory talk.") : t("The fastest way back in: next stream, last upload, and one fresh clip.")}
              eyebrow={t("Live")}
              title={isLive ? t("Watch the run live") : t("Don't miss the next stream")}
            />
            <div className="home-live-notes">
              <article className="card home-mini-card">
                <span className="home-mini-card__eyebrow">{t("Clip of the Day")}</span>
                <strong>{clipOfDay?.title || t("Best recent MapleStory moment")}</strong>
                <a className="home-mini-card__link" href={clipOfDay?.href || "/videos"}>{t("Watch Clip")}</a>
              </article>
              <article className="card home-mini-card">
                <span className="home-mini-card__eyebrow">{t("Latest Upload")}</span>
                <strong>{featuredUpload?.title || t("Fresh upload ready now")}</strong>
                <a className="home-mini-card__link" href="/videos">{t("See New Videos")}</a>
              </article>
            </div>
          </div>
          <StreamStatusCard {...liveCardDetails} />
        </div>
      </section>

      <section className="section section--tight" data-reveal>
        <div className="container">
          <div className="clip-day-hero card">
            <div className="clip-day-hero__media">
              {clipOfDay?.thumbnail ? <img alt="" decoding="async" loading="lazy" src={clipOfDay.thumbnail} /> : null}
              <span className="clip-day-hero__badge">{t("Clip of the Day")}</span>
              <span className="clip-day-hero__play">{t("Play")}</span>
            </div>
            <div className="clip-day-hero__copy">
              <span className="section-header__eyebrow">{t("Today's Fast Watch")}</span>
              <h2>{clipOfDay?.title || t("Best recent MapleStory moment")}</h2>
              <p>{t("One strong moment. One quick click.")}</p>
              <div className="clip-day-hero__meta">
                <span>{clipOfDay?.duration || t("Short clip")}</span>
                <span>{t("High replay value")}</span>
              </div>
              <div className="clip-day-hero__actions">
                <a className="button button--primary" href={clipOfDay?.href || "/videos"}>{t("Watch Clip")}</a>
                <a className="button button--secondary" href="/videos">{t("More Clips")}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight" data-reveal>
        <div className="container">
          <SectionHeader
            description={t("Three reasons to check back every day.")}
            eyebrow={t("Return Daily")}
            title={t("Always something new waiting")}
          />
          <div className="home-return-grid">
            <article className="card home-return-card home-return-card--highlight">
              <span className="home-return-card__eyebrow">{t("Clip of the Day")}</span>
              <strong>{clipOfDay?.title || t("One fast moment worth the click")}</strong>
              <p>{t("Quick payoff. Easy replay.")}</p>
              <a className="button button--secondary" href={clipOfDay?.href || "/videos"}>{t("Watch Today's Clip")}</a>
            </article>

            <article className="card home-return-card home-return-card--upload">
              <span className="home-return-card__eyebrow">{t("Latest Upload")}</span>
              <strong>{featuredUpload?.title || t("Fresh upload ready now")}</strong>
              <p>{t("New guide, new run, or new account call.")}</p>
              <a className="button button--ghost" href="/videos">{t("See Latest Upload")}</a>
            </article>

          </div>
        </div>
      </section>

      <section className="section" data-reveal>
        <div className="container">
          <SectionHeader
            action={{ label: "See New Videos", href: "/videos" }}
            description={
              activeFilter === "all"
                ? t("Full uploads, quick picks, and one featured clip.")
                : t(`Fast picks from ${contentFilters.find((filter) => filter.key === activeFilter)?.label.toLowerCase()}.`)
            }
            eyebrow={t("Videos")}
            title={
              activeFilter === "all"
                ? t("Watch the best part first")
                : t(`${contentFilters.find((filter) => filter.key === activeFilter)?.label} first`)
            }
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
              <span className="section-header__eyebrow">{t("Featured Clip")}</span>
              <h3>{t("Clip of the day")}</h3>
              <p>{t("One quick moment worth the click.")}</p>
              <strong>{clipOfDay?.title || t("Best recent MapleStory moment")}</strong>
              <div className="featured-moment-card__stats">
                <span>{t("Fast watch")}</span>
                <span>{t("High replay value")}</span>
              </div>
              <a className="button button--secondary button--full" href={clipOfDay?.href || "/videos"}>{t("Watch Clip")}</a>
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
              <span className="section-header__eyebrow">{t("Community")}</span>
              <h2>{t("Get the ping before everyone else")}</h2>
              <p>{t("Discord is where the next stream, next upload, and fastest answers land first.")}</p>
              <div className="home-community__proof">
                <span>{t("Live every week")}</span>
                <span>{t("Fresh drops first")}</span>
                <span>{t("Community active daily")}</span>
              </div>
              <div className="home-community__benefits">
                <span>{t("Live alerts first")}</span>
                <span>{t("Ask for help fast")}</span>
                <span>{t("Patch talk that matters")}</span>
              </div>
              <strong className="home-community__urgency">{t("Miss Discord, miss the update.")}</strong>
              <div className="home-community__actions">
                <a className="button button--primary" href="/community">{t("Join Discord First")}</a>
                <a className="button button--secondary" href="/live">{t("Watch Live")}</a>
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
        cta={{ label: t("About SNAILSLAYER"), href: "/about" }}
        description={t("I go deep, keep it honest, and stay open when the community needs real help.")}
        points={[t("Reliable info"), t("Real opinion"), t("Open help")]}
        title={t("Why people stay")}
      />
    </>
  );
}
