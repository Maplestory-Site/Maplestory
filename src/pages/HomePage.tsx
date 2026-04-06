import { usePageMeta } from "../app/usePageMeta";
import { AboutBlock } from "../components/content/AboutBlock";
import { CtaBanner } from "../components/content/CtaBanner";
import { SocialLinkCard } from "../components/content/SocialLinkCard";
import { StreamStatusCard } from "../components/content/StreamStatusCard";
import { VideoCard } from "../components/content/VideoCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import {
  aboutPoints,
  creatorPoints,
  socialLinks,
  streamDetails
} from "../data/siteContent";
import {
  twitchChannelUrl,
  twitchGameName,
  twitchLiveStatus,
  twitchStreamTitle,
  twitchViewerCount
} from "../data/twitchFeed";
import { youtubeVideos } from "../data/youtubeFeed";

export function HomePage() {
  usePageMeta("Home", "MapleStory guides, live streams, bossing, and progression content for players who want cleaner progress.");

  const featuredVideos = youtubeVideos.slice(0, 4).map((item) => ({ ...item, featured: false }));
  const liveCardDetails = {
    ...streamDetails,
    status: twitchLiveStatus as "live" | "offline",
    title: twitchLiveStatus === "live" && twitchStreamTitle ? twitchStreamTitle : streamDetails.title,
    description:
      twitchLiveStatus === "live"
        ? `SNAILSLAYER is live now on ${twitchGameName}. Jump in for bossing, progression, and live MapleStory discussion.`
        : "Currently offline. Follow on Twitch or join Discord to catch the next session as soon as it starts.",
    viewerCount: twitchViewerCount,
    primaryCta: { label: "Watch on Twitch", href: twitchChannelUrl }
  };

  return (
    <>
      <section className="section section--profile">
        <div className="container creator-profile">
          <div className="creator-profile__avatar card">
            <img alt="SNAILSLAYER avatar" src="/avatar.jpg" />
          </div>
          <div className="creator-profile__content card">
            <span className="section-header__eyebrow">Description</span>
            <div className="creator-profile__brand creator-profile__brand--top">
              <img alt="" aria-hidden="true" className="creator-profile__gif creator-profile__gif--left" decoding="async" loading="eager" src="/mushroom-left.gif" />
              <h2>SNAILSLAYER</h2>
              <img alt="" aria-hidden="true" className="creator-profile__gif creator-profile__gif--right" decoding="async" loading="eager" src="/mushroom-right.gif" />
            </div>
            <div className="creator-profile__list">
              <p>🎮 MapleStory content built around bossing, progression, and real account growth.</p>
              <p>🍁 Clean guides, useful tips, and sharper decisions without wasting your time.</p>
              <p>⚔ Live runs, funny moments, and real reactions from every push and clear.</p>
              <p>🌟 From early progression to harder content, the goal is always cleaner runs.</p>
              <p>🏆 Watch the content, join the community, and stay close to every upload.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container proof-strip">
          {creatorPoints.map((point) => (
            <div className="proof-strip__item card" key={point}>
              <strong>{point}</strong>
            </div>
          ))}
        </div>
      </section>

      <AboutBlock
        cta={{ label: "More About Me", href: "/about" }}
        description="Useful clears, better progression, and cleaner explanations. No filler. Just strong videos, live sessions, and highlights."
        points={aboutPoints}
        title="Serious MapleStory content, kept simple"
      />

      <section className="section">
        <div className="container">
          <SectionHeader
            action={{ label: "View All Videos", href: "/videos" }}
            description="Fresh uploads across guides, bossing, progression, and standout moments."
            eyebrow="Latest Videos"
            title="Fresh uploads, easy to scan"
          />
          <div className="video-grid">
            {featuredVideos.map((item) => (
              <VideoCard item={item} key={item.id} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--stream">
        <div className="container two-column">
          <div className="stream-copy-panel card">
            <SectionHeader
              description="Catch bossing, progression sessions, account decisions, and real-time MapleStory discussion."
              eyebrow="Live"
              title="Watch MapleStory live"
            />
            <div className="bullet-stack">
              <span>Boss attempts</span>
              <span>Progression sessions</span>
              <span>Viewer questions</span>
            </div>
          </div>
          <StreamStatusCard {...liveCardDetails} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeader
            centered
            description="Get stream alerts, talk MapleStory, share progress, and stay close to every upload."
            eyebrow="Community"
            title="Join the Discord"
          />
          <div className="social-grid">
            {socialLinks.map((item) => (
              <SocialLinkCard item={item} key={item.platform} />
            ))}
          </div>
        </div>
      </section>

      <CtaBanner
        description="Watch live, catch the newest upload, or join the Discord and stay in the loop."
        primaryCta={{ label: "Watch Live", href: "/live" }}
        secondaryCta={{ label: "Join Discord", href: "/community" }}
        title="Pick your next stop"
      />
    </>
  );
}
