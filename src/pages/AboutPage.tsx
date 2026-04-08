import { usePageMeta } from "../app/usePageMeta";
import { AboutBlock } from "../components/content/AboutBlock";
import { CtaBanner } from "../components/content/CtaBanner";
import { aboutPoints } from "../data/siteContent";

export function AboutPage() {
  usePageMeta("About", "Meet SNAILSLAYER and the MapleStory content style behind the channel.");

  return (
    <>
      <AboutBlock
        cta={{ label: "See the Videos", href: "/videos" }}
        description="I'm SNAILSLAYER. I go deep, keep it honest, and stay open when the community needs help."
        points={aboutPoints}
        title="Why people watch"
      />

      <CtaBanner
        description="Catch the next stream, the latest upload, or the next Discord ping."
        primaryCta={{ label: "Watch Live Now", href: "/live" }}
        secondaryCta={{ label: "Join Discord", href: "/community" }}
        title="Stay close"
      />
    </>
  );
}
