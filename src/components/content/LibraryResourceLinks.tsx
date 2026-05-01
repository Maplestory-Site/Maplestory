import type { LibraryExternalLinkSummary } from "../../lib/libraryGuides";
import { SectionHeader } from "../ui/SectionHeader";

type Props = {
  links: LibraryExternalLinkSummary[];
};

export function LibraryResourceLinks({ links }: Props) {
  if (!links.length) return null;

  return (
    <section className="library-resources" aria-label="Trusted resource links">
      <SectionHeader
        description="External references are credited and marked by type."
        eyebrow="Resources"
        title="Useful Links"
      />
      <div className="library-resources__grid">
        {links.map((link) => (
          <a
            className="library-resource-card card"
            href={link.url}
            key={link.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>{link.type}</span>
            <strong>{link.label}</strong>
            <small>{link.guideCount} guide reference{link.guideCount === 1 ? "" : "s"}</small>
          </a>
        ))}
      </div>
    </section>
  );
}
