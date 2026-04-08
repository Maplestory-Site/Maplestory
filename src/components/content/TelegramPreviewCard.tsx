import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import type { TelegramPostPreview } from "../../data/contentAutomation";

type TelegramPreviewCardProps = {
  posts: TelegramPostPreview[];
  telegramHref: string;
};

export function TelegramPreviewCard({ posts, telegramHref }: TelegramPreviewCardProps) {
  const [featuredPost, ...morePosts] = posts;

  return (
    <article className="card telegram-preview-card">
      <div className="telegram-preview-card__top">
        <div>
          <span className="section-header__eyebrow">Telegram</span>
          <h3>Join Telegram</h3>
        </div>
        <Badge label="Fast Alerts" tone="info" />
      </div>

      {featuredPost ? (
        <div className="telegram-preview-card__featured">
          <span className="telegram-preview-card__label">{featuredPost.label}</span>
          <strong>{featuredPost.message}</strong>
          <span>{featuredPost.published}</span>
        </div>
      ) : null}

      {morePosts.length ? (
        <div className="telegram-preview-card__list">
          {morePosts.map((post) => (
            <div className="telegram-preview-card__item" key={post.id}>
              <strong>{post.message}</strong>
              <span>{post.published}</span>
            </div>
          ))}
        </div>
      ) : null}

      <Button href={telegramHref}>Join Telegram</Button>
    </article>
  );
}

