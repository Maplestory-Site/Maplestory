import type { LibraryGuide } from "../../data/libraryGuides";
import { SectionHeader } from "../ui/SectionHeader";
import { LibraryGuideCard } from "./LibraryGuideCard";

type Props = {
  guides: LibraryGuide[];
  onSelectGuide: (guide: LibraryGuide) => void;
};

export function LibraryFeaturedGuides({ guides, onSelectGuide }: Props) {
  if (!guides.length) return null;

  return (
    <section className="library-featured" aria-label="Featured guides">
      <SectionHeader
        description="Hand-picked routes for the most common next steps."
        eyebrow="Featured guides"
        title="Start Here"
      />
      <div className="library-grid library-grid--featured">
        {guides.map((guide) => (
          <LibraryGuideCard featured guide={guide} key={guide.id} onSelect={onSelectGuide} />
        ))}
      </div>
    </section>
  );
}
