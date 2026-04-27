import { useEffect } from "react";
import type { LibraryGuide } from "../../data/libraryGuides";
import { Button } from "../ui/Button";

type Props = {
  guide: LibraryGuide | null;
  related: LibraryGuide[];
  onClose: () => void;
  onSelectRelated: (guide: LibraryGuide) => void;
};

export function LibraryGuideModal({ guide, related, onClose, onSelectRelated }: Props) {
  // ESC closes the modal — same affordance as the news modals.
  useEffect(() => {
    if (!guide) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [guide, onClose]);

  if (!guide) return null;

  const paragraphs = splitParagraphs(guide.body);
  const hasThirdPartyLink = guide.sourceLinks?.some((link) => link.thirdParty);

  return (
    <div className="library-modal" role="dialog" aria-modal="true" aria-label={guide.title}>
      <div className="library-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <article className="library-modal__panel card">
        <header className="library-modal__header">
          <div>
            <span className="library-modal__eyebrow">{guide.subcategory}</span>
            <h2 className="library-modal__title">{guide.title}</h2>
            <div className="library-modal__chips">
              <span className={`library-card__badge library-card__badge--${guide.difficulty.toLowerCase()}`}>
                {guide.difficulty}
              </span>
              <span className="library-card__badge">{guide.region}</span>
              {guide.recommendedLevel ? (
                <span className="library-card__badge library-card__badge--info">{guide.recommendedLevel}</span>
              ) : null}
            </div>
          </div>
          <button className="library-modal__close" onClick={onClose} type="button" aria-label="Close guide">
            ×
          </button>
        </header>

        <div className="library-modal__body">
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

          {guide.audience ? (
            <section className="library-modal__audience">
              <h3>Who this is for</h3>
              <p>{guide.audience}</p>
            </section>
          ) : null}

          <section className="library-modal__content">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </section>

          {guide.sourceLinks?.length ? (
            <section className="library-modal__sources">
              <h3>External Sources</h3>
              <ul>
                {guide.sourceLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} rel="noopener noreferrer" target="_blank">
                      {link.label}
                    </a>
                    {link.thirdParty ? <span className="library-modal__source-tag">Third-party</span> : null}
                  </li>
                ))}
              </ul>
              {hasThirdPartyLink ? (
                <p className="library-modal__disclaimer">
                  Third-party resources are not affiliated with or endorsed by Nexon. Linked content is the
                  property of its respective authors.
                </p>
              ) : null}
            </section>
          ) : null}

          {related.length ? (
            <section className="library-modal__related">
              <h3>Related Guides</h3>
              <ul>
                {related.map((rel) => (
                  <li key={rel.id}>
                    <button onClick={() => onSelectRelated(rel)} type="button">
                      <strong>{rel.title}</strong>
                      <span>{rel.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <footer className="library-modal__footer">
            <span>Last updated: {guide.lastUpdated}</span>
            <Button onClick={onClose} variant="ghost">
              Close
            </Button>
          </footer>
        </div>
      </article>
    </div>
  );
}

function splitParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
