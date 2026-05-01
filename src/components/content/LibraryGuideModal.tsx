import { useEffect, useState } from "react";
import type { LibraryGuide } from "../../data/libraryGuides";
import { isThirdPartyLinkType } from "../../lib/libraryGuides";
import { Button } from "../ui/Button";
import { LibraryGuideDetail } from "./LibraryGuideDetail";

type Props = {
  guide: LibraryGuide | null;
  related: LibraryGuide[];
  onClose: () => void;
  onSelectRelated: (guide: LibraryGuide) => void;
};

export function LibraryGuideModal({ guide, related, onClose, onSelectRelated }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!guide) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [guide, onClose]);

  // Reset the "Copied!" hint when switching guides.
  useEffect(() => {
    setCopied(false);
  }, [guide?.id]);

  if (!guide) return null;

  const copyLink = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/library/${guide.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers: temporary textarea.
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const sourceLinks = guide.externalLinks?.length
    ? guide.externalLinks.map((link) => ({
        label: link.label,
        href: link.url,
        thirdParty: isThirdPartyLinkType(link.type)
      }))
    : guide.sourceLinks ?? [];
  const hasThirdPartyLink = sourceLinks.some((link) => link.thirdParty);

  return (
    <div className="library-modal" role="dialog" aria-modal="true" aria-label={guide.title}>
      <div className="library-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <article className="library-modal__panel card">
        <header className="library-modal__header">
          <div>
            <span className="library-modal__eyebrow">{guide.subcategory ?? guide.category}</span>
            <h2 className="library-modal__title">{guide.title}</h2>
            <div className="library-modal__chips">
              <span className={`library-card__badge library-card__badge--${guide.difficulty.toLowerCase()}`}>
                {guide.difficulty}
              </span>
              <span className="library-card__badge">{guide.region}</span>
              <span className="library-card__badge library-card__badge--info">{guide.estimatedReadTime}</span>
              {guide.recommendedLevel ? (
                <span className="library-card__badge library-card__badge--info">{guide.recommendedLevel}</span>
              ) : null}
            </div>
          </div>
          <button className="library-modal__close" onClick={onClose} type="button" aria-label="Close guide">
            x
          </button>
        </header>

        <LibraryGuideDetail guide={guide} hasThirdPartyLink={hasThirdPartyLink} sourceLinks={sourceLinks} />

        <div className="library-modal__body library-modal__body--footer">
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
            <div className="library-modal__footer-actions">
              <button className="library-modal__copy" onClick={copyLink} type="button">
                {copied ? "Copied!" : "Copy guide link"}
              </button>
              <Button onClick={onClose} variant="ghost">
                Close
              </Button>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}
