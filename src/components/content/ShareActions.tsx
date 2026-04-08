import { useMemo, useState } from "react";

type ShareActionsProps = {
  href: string;
  title: string;
};

type FeedbackState = "idle" | "copied" | "shared" | "discord";

export function ShareActions({ href, title }: ShareActionsProps) {
  const [feedback, setFeedback] = useState<FeedbackState>("idle");

  const shareUrl = useMemo(() => {
    if (/^https?:\/\//.test(href)) {
      return href;
    }

    if (typeof window !== "undefined") {
      return new URL(href, window.location.origin).toString();
    }

    return href;
  }, [href]);

  function showFeedback(next: FeedbackState) {
    setFeedback(next);
    window.setTimeout(() => setFeedback("idle"), 1800);
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Watch this on SNAILSLAYER`,
          url: shareUrl
        });
        showFeedback("shared");
        return;
      } catch {
        // fall through to copy
      }
    }

    await handleCopy();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showFeedback("copied");
    } catch {
      showFeedback("shared");
    }
  }

  async function handleDiscord() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore clipboard errors and still open Discord
    }

    window.open("https://discord.com/app", "_blank", "noopener,noreferrer");
    showFeedback("discord");
  }

  const feedbackLabel =
    feedback === "copied"
      ? "Link copied"
      : feedback === "shared"
        ? "Ready to share"
        : feedback === "discord"
          ? "Link copied for Discord"
          : "Spread this clip";

  return (
    <div className="content-share" role="group" aria-label={`Share ${title}`}>
      <div className="content-share__actions">
        <button className="content-share__button" onClick={handleShare} type="button">
          Share
        </button>
        <button className="content-share__button" onClick={handleCopy} type="button">
          Copy Link
        </button>
        <button className="content-share__button content-share__button--discord" onClick={handleDiscord} type="button">
          Send to Discord
        </button>
      </div>
      <span aria-live="polite" className="content-share__status">
        {feedbackLabel}
      </span>
    </div>
  );
}
