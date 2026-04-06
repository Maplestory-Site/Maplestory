import { usePageMeta } from "../app/usePageMeta";
import { CtaBanner } from "../components/content/CtaBanner";
import { SocialLinkCard } from "../components/content/SocialLinkCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { communityBenefits, socialLinks } from "../data/siteContent";

export function CommunityPage() {
  usePageMeta("Community", "Join the MapleStory creator community for Discord alerts, stream updates, and channel drops.");

  return (
    <>
      <section className="section section--page-start">
        <div className="container two-column">
          <div>
            <SectionHeader description="Discord is the best place to keep up with the content and the next stream." title="Why join" />
            <div className="bullet-stack bullet-stack--column">
              {communityBenefits.map((benefit) => (
                <span key={benefit}>{benefit}</span>
              ))}
            </div>
          </div>
          <div className="social-grid social-grid--stacked">
            {socialLinks.map((item) => (
              <SocialLinkCard item={item} key={item.platform} />
            ))}
          </div>
        </div>
      </section>

      <CtaBanner
        description="Want stream alerts and fresh updates? Discord is the best place to start."
        primaryCta={{ label: "Join Discord", href: "/community" }}
        secondaryCta={{ label: "Watch Live", href: "/live" }}
        title="Stay in the loop"
      />
    </>
  );
}
