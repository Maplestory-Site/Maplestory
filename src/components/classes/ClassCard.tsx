import { useRef } from "react";
import type { ClassJob } from "../../data/classesJobs";

type ClassCardProps = {
  item: ClassJob;
  onSelect: (item: ClassJob) => void;
};

export function ClassCard({ item, onSelect }: ClassCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startPreview = () => {
    if (!item.previewVideo || !videoRef.current) {
      return;
    }

    videoRef.current.play().catch(() => {});
  };

  const stopPreview = () => {
    if (!item.previewVideo || !videoRef.current) {
      return;
    }

    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  };

  return (
    <button
      type="button"
      className="class-card reveal-on-scroll"
      onClick={() => onSelect(item)}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      onFocus={startPreview}
      onBlur={stopPreview}
    >
      <div className="class-card__media">
        {item.previewVideo ? (
          <>
            <video
              ref={videoRef}
              className="class-card__preview-video"
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            >
              <source src={item.previewVideo} type="video/mp4" />
            </video>
            <div className="class-card__video-overlay" />
          </>
        ) : (
          <div className="class-card__crest">{item.name.slice(0, 2).toUpperCase()}</div>
        )}
      </div>
      <div className="class-card__content">
        <div className="class-card__identity">
          <h3>{item.name}</h3>
          <p>{item.category}</p>
        </div>
        <div className="class-card__footer">
          <span className="class-card__difficulty">{item.difficulty}</span>
          <span className="class-card__playstyle">{item.playstyle}</span>
        </div>
        <div className="class-card__tags">
          {item.tags.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </button>
  );
}
