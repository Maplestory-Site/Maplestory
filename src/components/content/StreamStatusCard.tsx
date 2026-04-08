import { useEffect, useState } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { twitchChannelLogin } from "../../data/twitchFeed";

type StreamStatusCardProps = {
  status: "live" | "offline" | "soon";
  title: string;
  description: string;
  nextStream: string;
  viewerCount?: number;
  streamTitle?: string;
  offlinePreviewSrc?: string;
  lastStreamLabel?: string;
  lastStreamTitle?: string;
  lastStreamHref?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export function StreamStatusCard({
  status,
  title,
  description,
  nextStream,
  viewerCount,
  streamTitle,
  offlinePreviewSrc = "/classic-maple-nostalgia.mp4",
  lastStreamLabel = "Last stream",
  lastStreamTitle = "Catch the latest run replay",
  lastStreamHref = "/videos",
  primaryCta,
  secondaryCta
}: StreamStatusCardProps) {
  const isLive = status === "live";
  const [parentHost, setParentHost] = useState("localhost");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setParentHost(window.location.hostname || "localhost");
    }
  }, []);

  return (
    <article className="card stream-card" data-reveal>
      <div className="stream-card__top">
        <Badge label={isLive ? "LIVE" : "OFFLINE"} tone={isLive ? "live" : "offline"} />
        {isLive && viewerCount ? <span>{viewerCount} watching now</span> : <span>{nextStream}</span>}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {streamTitle ? (
        <div className="stream-card__stream-title">
          <span>Stream title</span>
          <strong>{streamTitle}</strong>
        </div>
      ) : null}
      <div className={`stream-card__preview ${isLive ? "is-live" : "is-offline"}`}>
        {isLive ? (
          <>
            <div className="stream-card__preview-top">
              <span className="stream-card__preview-brand">TWITCH</span>
              <span className="stream-card__preview-status is-live">LIVE</span>
            </div>
            <div className="stream-card__live-embed">
              <iframe
                allow="autoplay; fullscreen"
                allowFullScreen
                loading="lazy"
                src={`https://player.twitch.tv/?channel=${twitchChannelLogin}&parent=${parentHost}&autoplay=true&muted=false`}
                title="Twitch live stream"
              />
            </div>
          </>
        ) : (
          <>
            <div className="stream-card__preview-top">
              <span className="stream-card__preview-brand">TWITCH</span>
              <span className="stream-card__preview-status is-offline">OFFLINE</span>
            </div>
            <div className="stream-card__offline-visual">
              <video
                autoPlay
                className="stream-card__offline-video"
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src={offlinePreviewSrc} type="video/mp4" />
              </video>
            </div>
            <div className="stream-card__preview-body">
              <div className="stream-card__preview-channel">
                <span className="stream-card__preview-avatar">{twitchChannelLogin.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{twitchChannelLogin}</strong>
                  <span>Follow for the next run</span>
                </div>
              </div>
              <div className="stream-card__preview-copy">
                <strong>Currently offline</strong>
                <span>The next run starts on Twitch.</span>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="stream-card__schedule">
        <span>{isLive ? "Status" : "Next stream"}</span>
        <strong>{isLive ? "Live on Twitch now" : nextStream}</strong>
      </div>
      {!isLive ? (
        <a className="stream-card__last-stream" href={lastStreamHref}>
          <span>{lastStreamLabel}</span>
          <strong>{lastStreamTitle}</strong>
        </a>
      ) : null}
      <div className="stream-card__actions">
        <Button href={primaryCta.href}>{primaryCta.label}</Button>
        {secondaryCta ? <Button href={secondaryCta.href} variant="secondary">{secondaryCta.label}</Button> : null}
      </div>
    </article>
  );
}
