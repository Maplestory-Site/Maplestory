import { usePageMeta } from "../app/usePageMeta";
import { ActivityFeedCard } from "../components/content/ActivityFeedCard";
import { CtaBanner } from "../components/content/CtaBanner";
import { LeaderboardPanel } from "../components/content/LeaderboardPanel";
import { SocialLinkCard } from "../components/content/SocialLinkCard";
import { TelegramPreviewCard } from "../components/content/TelegramPreviewCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { communityBenefits, socialLinks } from "../data/siteContent";
import { syncedContentFeed, telegramPreviewPosts } from "../data/contentAutomation";
import { leaderboards } from "../data/leaderboards";

export function CommunityPage() {
  usePageMeta("Community", "Join the MapleStory creator community for Discord alerts, stream updates, and channel drops.");
  const telegramLink = socialLinks.find((item) => item.platform === "Telegram")?.href ?? "https://t.me/snailslayermain";
  const primarySocialCards = socialLinks.filter((item) => item.platform !== "Telegram");

  return (
    <>
      <section className="section section--page-start" data-reveal>
        <div className="container two-column">
          <div>
            <SectionHeader description="Discord is where the next stream, fresh clip, and real help hit first." title="Join the inner circle" />
            <div className="community-proof-strip">
              <span>Alerts first</span>
              <span>Daily activity</span>
              <span>Fast answers</span>
            </div>
            <div className="bullet-stack bullet-stack--column">
              {communityBenefits.map((benefit) => (
                <span key={benefit}>{benefit}</span>
              ))}
            </div>
            <div className="community-urgency card">
              <span className="section-header__eyebrow">Why now</span>
              <strong>The best updates do not wait on the homepage.</strong>
              <p>Streams start, clips drop, and the Discord sees it first.</p>
            </div>
            <div className="community-preview-stack">
              <TelegramPreviewCard posts={telegramPreviewPosts} telegramHref={telegramLink} />
              <ActivityFeedCard items={syncedContentFeed.slice(0, 3)} />
            </div>
          </div>
          <div className="social-grid social-grid--stacked">
            {primarySocialCards.map((item) => (
              <SocialLinkCard item={item} key={item.platform} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight" data-reveal>
        <div className="container">
          <LeaderboardPanel columns={leaderboards} />
        </div>
      </section>

      <CtaBanner
        description="Get the alert first, ask for help fast, and stay in the loop before the next run goes live."
        primaryCta={{ label: "Join Telegram", href: telegramLink }}
        secondaryCta={{ label: "Join Discord First", href: "/community" }}
        title="Do not miss the next alert"
      />
    </>
  );
}
