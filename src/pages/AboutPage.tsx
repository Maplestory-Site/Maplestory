import { usePageMeta } from "../app/usePageMeta";
import { AboutBlock } from "../components/content/AboutBlock";
import { CtaBanner } from "../components/content/CtaBanner";
import { aboutPoints } from "../data/siteContent";

export function AboutPage() {
  usePageMeta("About", "Meet SNAILSLAYER and the MapleStory content style behind the channel.");

  return (
    <>
      <AboutBlock
        cta={{ label: "Watch the Content", href: "/videos" }}
        description="I'm SNAILSLAYER. I go deep into the details, give reliable information, share my real opinion, and stay available for anyone in the community who needs help."
        points={aboutPoints}
        title="Why people watch"
      />

      <CtaBanner
        description="Watch the content, catch the next stream, or join the Discord and stay close to every update."
        primaryCta={{ label: "Watch Live", href: "/live" }}
        secondaryCta={{ label: "Join Discord", href: "/community" }}
        title="Stay connected"
      />
    </>
  );
}
