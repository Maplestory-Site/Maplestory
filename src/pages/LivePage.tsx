import { usePageMeta } from "../app/usePageMeta";
import { CtaBanner } from "../components/content/CtaBanner";
import { StreamStatusCard } from "../components/content/StreamStatusCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { streamDetails } from "../data/siteContent";
import { twitchChannelUrl, twitchGameName, twitchLiveStatus, twitchStreamTitle, twitchViewerCount } from "../data/twitchFeed";

export function LivePage() {
  usePageMeta("Live", "Watch live MapleStory bossing, progression sessions, and real-time community discussion.");

  const liveCardDetails = {
    ...streamDetails,
    status: twitchLiveStatus as "live" | "offline",
    title: twitchLiveStatus === "live" && twitchStreamTitle ? twitchStreamTitle : streamDetails.title,
    description:
      twitchLiveStatus === "live"
        ? `SNAILSLAYER is live now on ${twitchGameName}. Jump in for bossing, progression, and real-time MapleStory talk.`
        : "Offline right now, but the next stream is where the clean clears, detailed breakdowns, and live MapleStory decisions happen.",
    viewerCount: twitchViewerCount,
    primaryCta: { label: "Watch on Twitch", href: twitchChannelUrl }
  };

  return (
    <>
      <section className="section section--page-start">
        <div className="container two-column">
          <div>
            <SectionHeader
              description="The stream is built around live clears, progression choices, and strong viewer interaction."
              title="What happens on stream"
            />
            <div className="bullet-stack bullet-stack--column">
              <span>Live progression with real choices and real results</span>
              <span>Boss runs, attempts, and cleaner clears</span>
              <span>MapleStory talk with the community in real time</span>
            </div>
            <div className="live-feature-art">
              <img alt="MapleStory guild crest art" src="/live-crest.jpg" />
            </div>
          </div>
          <StreamStatusCard {...liveCardDetails} />
        </div>
      </section>

      <CtaBanner
        description="Follow the stream and get alerts so you never miss the next run."
        primaryCta={{ label: "Watch on Twitch", href: "/live" }}
        secondaryCta={{ label: "Join Discord", href: "/community" }}
        title="Stay close to the next stream"
      />
    </>
  );
}
