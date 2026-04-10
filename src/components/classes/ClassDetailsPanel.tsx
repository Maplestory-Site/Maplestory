import { useEffect } from "react";
import type { ClassJob } from "../../data/classesJobs";
import { Button } from "../ui/Button";
import { RatingDisplay } from "./RatingDisplay";

type ClassDetailsPanelProps = {
  item: ClassJob | null;
  onClose: () => void;
};

export function ClassDetailsPanel({ item, onClose }: ClassDetailsPanelProps) {
  useEffect(() => {
    if (!item) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  if (!item) {
    return null;
  }

  return (
    <div className="class-details" role="dialog" aria-modal="true" aria-label={`${item.name} details`}>
      <button type="button" className="class-details__backdrop" aria-label="Close class details" onClick={onClose} />
      <aside className="class-details__panel">
        <div className="class-details__top">
          <div>
            <span className="class-details__eyebrow">{item.previewVideoFaction ?? item.category}</span>
            <h2>{item.name}</h2>
            <p>{item.overview}</p>
          </div>
          <button type="button" className="class-details__close" aria-label="Close class details" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="class-details__layout">
          <div className="class-details__visual">
            {item.detailPreviewVideo ? (
              <video
                className="class-details__preview-video"
                src={item.detailPreviewVideo}
                muted
                loop
                autoPlay
                playsInline
                preload="metadata"
              />
            ) : item.previewVideo ? (
              <video
                className="class-details__preview-video"
                src={item.previewVideo}
                muted
                loop
                autoPlay
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="class-details__visual-fallback">{item.name.slice(0, 2).toUpperCase()}</div>
            )}
          </div>

          <div className="class-details__body">
            <div className="class-details__stats">
              <div className="class-details__badge">
                <span>Playstyle</span>
                <strong>{item.playstyle}</strong>
              </div>
              <div className="class-details__badge">
                <span>Difficulty</span>
                <strong>{item.difficulty}</strong>
              </div>
              <div className="class-details__badge">
                <span>Entry</span>
                <strong>{item.beginnerFriendly ? "Friendly" : "Advanced"}</strong>
              </div>
            </div>

            <div className="class-details__split">
              <div className="class-details__card">
                <h3>Strengths</h3>
                <ul>
                  {item.strengths.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </div>
              <div className="class-details__card">
                <h3>Weaknesses</h3>
                <ul>
                  {item.weaknesses.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="class-details__ratings">
              <RatingDisplay label="Bossing" value={item.bossingRating} />
              <RatingDisplay label="Farming" value={item.farmingRating} />
              <RatingDisplay label="Mobility" value={item.mobilityRating} />
              <RatingDisplay label="Survivability" value={item.survivabilityRating} />
            </div>

            <div className="class-details__footer">
              <div className="class-details__tags">
                {item.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="class-details__actions">
                <Button href="/videos" variant="primary">
                  Related Videos
                </Button>
                <Button href="/community" variant="secondary">
                  Ask the Community
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
