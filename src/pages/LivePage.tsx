import { useMemo } from "react";
import { usePageMeta } from "../app/usePageMeta";
import { CtaBanner } from "../components/content/CtaBanner";
import { NextStreamCountdown } from "../components/content/NextStreamCountdown";
import { StreamStatusCard } from "../components/content/StreamStatusCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { streamDetails } from "../data/siteContent";
import { youtubeVideos } from "../data/youtubeFeed";
import { twitchChannelUrl, twitchGameName, twitchLiveStatus, twitchStreamTitle, twitchViewerCount } from "../data/twitchFeed";

export function LivePage() {
  usePageMeta("Live", "Watch live MapleStory bossing, progression sessions, and real-time community discussion.");
  const latestReplay = youtubeVideos[0];
  const nextStreamDate = useMemo(() => {
    const target = new Date();
    target.setHours(20, 0, 0, 0);

    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1);
    }

    return target;
  }, []);

  const liveCardDetails = {
    ...streamDetails,
    status: twitchLiveStatus as "live" | "offline",
    title: twitchLiveStatus === "live" && twitchStreamTitle ? twitchStreamTitle : streamDetails.title,
    description:
      twitchLiveStatus === "live"
        ? `SNAILSLAYER is live now on ${twitchGameName}. Come watch the run.`
        : "Offline now. The next stream is where the real calls, clears, and breakdowns happen.",
    viewerCount: twitchViewerCount,
    streamTitle: twitchStreamTitle || "Bossing, progression, and sharp MapleStory calls",
    primaryCta: { label: "Watch Live", href: twitchChannelUrl },
    lastStreamLabel: "Latest replay",
    lastStreamTitle: latestReplay?.title || "Watch the latest MapleStory run",
    lastStreamHref: latestReplay?.href || "/videos"
  };

  return (
    <>
      <section className="section section--page-start" data-reveal>
        <div className="container two-column">
          <div>
            <SectionHeader
              description="Boss clears, progression calls, and live chat."
              title="What happens live"
            />
            <NextStreamCountdown
              description="Catch the next run the second it starts."
              targetDate={nextStreamDate}
              title="Next stream countdown"
            />
            <div className="bullet-stack bullet-stack--column">
              <span>Real progression. Real choices.</span>
              <span>Boss attempts with clean breakdowns.</span>
              <span>Live questions from the community.</span>
            </div>
          </div>
          <StreamStatusCard {...liveCardDetails} />
        </div>
      </section>

      <CtaBanner
        description="Follow live and get the ping before the run starts."
        primaryCta={{ label: "Watch Live", href: twitchChannelUrl }}
        secondaryCta={{ label: "Join Discord", href: "/community" }}
        title="Catch the next run"
      />
    </>
  );
}
