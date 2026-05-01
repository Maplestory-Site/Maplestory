import type { LibraryGuide } from "../../data/libraryGuides";
import {
  getGuideHeroImage,
  getGuideIcon,
  getGuideTheme
} from "../../data/libraryAssets";
import { LibraryIcon } from "./LibraryIcon";

type SourceLink = {
  label: string;
  href: string;
  thirdParty?: boolean;
};

type Props = {
  guide: LibraryGuide;
  sourceLinks: SourceLink[];
  hasThirdPartyLink: boolean;
};

export function LibraryGuideDetail({ guide, sourceLinks, hasThirdPartyLink }: Props) {
  const theme = guide.visualTheme ?? getGuideTheme(guide);
  const heroImage = guide.heroImage || getGuideHeroImage(guide);
  const iconKey = guide.iconKey ?? getGuideIcon(guide);
  const sections = guide.sections.length
    ? guide.sections
    : guide.body
      ? [{ heading: "Guide", body: guide.body }]
      : [];
  const metaLine = `${guide.category} / ${guide.region} / ${guide.estimatedReadTime}`;

  return (
    <div className="library-modal__body">
      <section
        className="library-detail-hero"
        style={{
          ["--library-detail-accent" as string]: theme.accent,
          background: theme.gradient
        }}
      >
        <img
          alt=""
          className="library-detail-hero__image"
          decoding="async"
          loading="lazy"
          src={heroImage}
        />
        <div className="library-detail-hero__overlay" />
        <div className="library-detail-hero__content">
          <span className="library-detail-hero__icon" aria-hidden="true">
            <LibraryIcon name={iconKey} size={34} strokeWidth={2.2} />
          </span>
          <div>
            <span className="library-detail-hero__eyebrow">{metaLine}</span>
            <h3>{guide.title}</h3>
            <p>{guide.description}</p>
          </div>
        </div>
      </section>

      <section className="library-modal__summary">
        <h3>Quick Summary</h3>
        <p>{guide.summary}</p>
      </section>

      {guide.keyPoints.length ? (
        <section className="library-modal__keypoints">
          <h3>Key Points</h3>
          <ul>
            {guide.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="library-modal__info-grid">
        {guide.audience ? (
          <section>
            <h3>Audience</h3>
            <p>{guide.audience}</p>
          </section>
        ) : null}
        {guide.recommendedLevel ? (
          <section>
            <h3>Recommended Level</h3>
            <p>{guide.recommendedLevel}</p>
          </section>
        ) : null}
      </div>

      <section className="library-modal__content">
        {sections.map((section) => (
          <article key={section.heading} className="library-modal__section">
            <h3>{section.heading}</h3>
            {section.image ? <img alt="" decoding="async" loading="lazy" src={section.image} /> : null}
            {splitParagraphs(section.body).map((paragraph, index) => (
              <p key={`${section.heading}-${index}`}>{paragraph}</p>
            ))}
            {section.tips?.length ? (
              <div className="library-modal__callout library-modal__callout--tip">
                <strong>Tips</strong>
                <ul>
                  {section.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {section.warnings?.length ? (
              <div className="library-modal__callout library-modal__callout--warning">
                <strong>Watch out</strong>
                <ul>
                  {section.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      {sourceLinks.length ? (
        <section className="library-modal__sources">
          <h3>External Sources</h3>
          <ul>
            {sourceLinks.map((link, index) => (
              <li key={`${link.href}-${index}`}>
                <a href={link.href} rel="noopener noreferrer" target="_blank">
                  {link.label}
                </a>
                {link.thirdParty ? <span className="library-modal__source-tag">Third-party</span> : null}
              </li>
            ))}
          </ul>
          {hasThirdPartyLink ? (
            <p className="library-modal__disclaimer">
              Third-party resources are not affiliated with or endorsed by Nexon. Linked content belongs to its
              respective authors.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function splitParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
