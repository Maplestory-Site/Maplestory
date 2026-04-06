import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { twitchChannelLogin } from "../../data/twitchFeed";

type StreamStatusCardProps = {
  status: "live" | "offline" | "soon";
  title: string;
  description: string;
  nextStream: string;
  viewerCount?: number;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export function StreamStatusCard({
  status,
  title,
  description,
  nextStream,
  viewerCount,
  primaryCta,
  secondaryCta
}: StreamStatusCardProps) {
  const isLive = status === "live";

  return (
    <article className="card stream-card">
      <div className="stream-card__top">
        <Badge label={isLive ? "LIVE" : "OFFLINE"} tone={isLive ? "live" : "offline"} />
        {isLive && viewerCount ? <span>{viewerCount} watching</span> : <span>{nextStream}</span>}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
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
                src={`https://player.twitch.tv/?channel=${twitchChannelLogin}&parent=localhost&autoplay=true&muted=false`}
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
            <div className={`stream-card__pulse ${isLive ? "is-live" : "is-offline"}`} />
            <div className="stream-card__offline-visual">
              <img alt="Offline stream preview" src="/offline-live-preview.gif" />
            </div>
            <div className="stream-card__preview-body">
              <div className="stream-card__preview-channel">
                <span className="stream-card__preview-avatar">{twitchChannelLogin.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{twitchChannelLogin}</strong>
                  <span>Follow for the next MapleStory stream</span>
                </div>
              </div>
              <div className="stream-card__preview-copy">
                <strong>Currently offline</strong>
                <span>The next stream will go live from the Twitch channel.</span>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="stream-card__schedule">
        <span>{isLive ? "Status" : "Next stream"}</span>
        <strong>{isLive ? "Live on Twitch now" : nextStream}</strong>
      </div>
      <div className="stream-card__actions">
        <Button href={primaryCta.href}>{primaryCta.label}</Button>
        {secondaryCta ? <Button href={secondaryCta.href} variant="secondary">{secondaryCta.label}</Button> : null}
      </div>
    </article>
  );
}
