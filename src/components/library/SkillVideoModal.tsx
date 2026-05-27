import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import type { LibrarySkillIconEntry } from "../../data/librarySkillIcons";
import { getSkillVideoMeta } from "../../lib/skillVideo";

type Props = {
  /** Currently-open skill, or null when the modal is closed. */
  skill: LibrarySkillIconEntry | null;
  /** Optional class label shown in the header eyebrow. */
  className?: string;
  onClose: () => void;
};

const TYPE_LABEL: Record<LibrarySkillIconEntry["type"], string> = {
  active: "Active",
  buff: "Buff",
  summon: "Summon",
  cooldown: "Cooldown",
  bind: "Bind",
  iframe: "iFrame"
};

/**
 * Premium skill-preview modal.
 *
 * Renders an embedded video player when the skill has a `videoUrl` (YouTube
 * iframe or local mp4 `<video>` tag). Falls back to a clean "no preview"
 * state otherwise. ESC and backdrop click both close.
 *
 * The modal NEVER navigates the user away from the site — links are
 * deliberately omitted; only inline embeds are rendered.
 */
export function SkillVideoModal({ skill, className, onClose }: Props) {
  const [iframeReady, setIframeReady] = useState(false);

  // ESC key closes the modal.
  useEffect(() => {
    if (!skill) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [skill, onClose]);

  // Reset iframe-ready flag whenever a new skill opens.
  useEffect(() => {
    setIframeReady(false);
  }, [skill?.id]);

  const meta = useMemo(
    () => (skill ? getSkillVideoMeta(skill.videoUrl, skill.videoType) : null),
    [skill]
  );

  if (!skill) return null;

  const handleIconError = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied === "true") return;
    image.dataset.fallbackApplied = "true";
    image.src = skill.localFallback;
  };

  return (
    <div className="skill-video-modal" role="dialog" aria-modal="true" aria-label={skill.label}>
      <div className="skill-video-modal__backdrop" onClick={onClose} aria-hidden="true" />

      <article className="skill-video-modal__panel" role="document">
        <header className="skill-video-modal__header">
          <span className="skill-video-modal__icon">
            <img alt="" decoding="async" loading="lazy" src={skill.icon} onError={handleIconError} />
          </span>
          <div className="skill-video-modal__heading">
            {className ? <span className="skill-video-modal__eyebrow">{className}</span> : null}
            <h2>{skill.label}</h2>
            <div className="skill-video-modal__chips">
              <span className={`skill-video-modal__chip skill-video-modal__chip--${skill.type}`}>
                {TYPE_LABEL[skill.type] ?? skill.type}
              </span>
              {skill.cooldownLabel ? (
                <span className="skill-video-modal__chip">CD {skill.cooldownLabel}</span>
              ) : null}
              {skill.durationLabel ? (
                <span className="skill-video-modal__chip">Duration {skill.durationLabel}</span>
              ) : null}
              {skill.metaLabel ? (
                <span className="skill-video-modal__chip">{skill.metaLabel}</span>
              ) : null}
            </div>
          </div>
          <button
            className="skill-video-modal__close"
            onClick={onClose}
            type="button"
            aria-label="Close skill preview"
          >
            ×
          </button>
        </header>

        <div className="skill-video-modal__body">
          <section className="skill-video-modal__media" aria-label="Skill video preview">
            {meta?.embed && meta.type === "youtube" ? (
              <div className="skill-video-modal__media-frame">
                {!iframeReady ? <div className="skill-video-modal__skeleton" aria-hidden="true" /> : null}
                <iframe
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  onLoad={() => setIframeReady(true)}
                  referrerPolicy="strict-origin-when-cross-origin"
                  src={meta.embed}
                  title={`${skill.label} preview`}
                />
              </div>
            ) : meta?.embed && meta.type === "mp4" ? (
              <div className="skill-video-modal__media-frame">
                <video
                  autoPlay
                  controls
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  src={meta.embed}
                />
              </div>
            ) : (
              <div className="skill-video-modal__media-empty" role="status">
                <div className="skill-video-modal__media-empty-icon" aria-hidden="true">
                  <img alt="" src={skill.icon} onError={handleIconError} />
                </div>
                <strong>No preview available yet</strong>
                <span>This skill doesn't have an embedded preview. Add one via the data file.</span>
              </div>
            )}
          </section>

          <section className="skill-video-modal__copy">
            <h3>Description</h3>
            <p>{skill.description}</p>

            {skill.effects?.length ? (
              <>
                <h3>Effects</h3>
                <ul className="skill-video-modal__effects">
                  {skill.effects.map((effect) => (
                    <li key={effect}>{effect}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </div>
      </article>
    </div>
  );
}
