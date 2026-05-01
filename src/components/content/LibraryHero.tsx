import type { LibraryGuide } from "../../data/libraryGuides";

type Props = {
  totalGuides: number;
  beginnerGuides: LibraryGuide[];
  onSelectGuide: (guide: LibraryGuide) => void;
};

export function LibraryHero({ totalGuides, beginnerGuides, onSelectGuide }: Props) {
  return (
    <section className="library-hero card" aria-labelledby="library-hero-title">
      <div className="library-hero__copy">
        <span className="library-eyebrow">Maple Library</span>
        <h1 id="library-hero-title">Guides that tell you what to do next.</h1>
        <p>
          Original MapleStory guide routes for progression, bosses, gear, classes, events, and trusted resources.
          Start with a short guide, then follow the related path.
        </p>
        <div className="library-hero__stats" aria-label="Library stats">
          <span>
            <strong>{totalGuides}</strong>
            Guides
          </span>
          <span>
            <strong>6</strong>
            Categories
          </span>
          <span>
            <strong>Fresh</strong>
            2026
          </span>
        </div>
      </div>

      <div className="library-hero__starter" aria-label="Recommended beginner guides">
        <span className="library-eyebrow">Start here</span>
        <div className="library-hero__routes">
          {beginnerGuides.map((guide) => (
            <button key={guide.id} onClick={() => onSelectGuide(guide)} type="button">
              <span>{guide.icon ?? "GO"}</span>
              <strong>{guide.title}</strong>
              <small>{guide.estimatedReadTime}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
