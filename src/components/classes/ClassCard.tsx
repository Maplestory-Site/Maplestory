import { useEffect, useRef, useState } from "react";
import type { ClassJob } from "../../data/classesJobs";

type ClassCardProps = {
  item: ClassJob;
  onSelect: (item: ClassJob) => void;
};

export function ClassCard({ item, onSelect }: ClassCardProps) {
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVisibleOnScreen, setIsVisibleOnScreen] = useState(false);

  useEffect(() => {
    if (!item.previewVideo || typeof window === "undefined" || !cardRef.current) {
      setIsVisibleOnScreen(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisibleOnScreen(entry.isIntersecting && entry.intersectionRatio >= 0.35);
      },
      {
        threshold: [0.15, 0.35, 0.6],
        rootMargin: "96px 0px"
      }
    );

    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, [item.previewVideo]);

  useEffect(() => {
    if (!item.previewVideo || !videoRef.current) {
      return;
    }

    if (isVisibleOnScreen) {
      videoRef.current.play().catch(() => {});
      return;
    }

    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  }, [isVisibleOnScreen, item.previewVideo]);

  const startPreview = () => {
    return;
  };

  const stopPreview = () => {
    return;
  };

  return (
    <button
      ref={cardRef}
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
              autoPlay={isVisibleOnScreen}
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
          <p>{item.previewVideoFaction ?? item.category}</p>
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
