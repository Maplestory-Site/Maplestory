import { usePageMeta } from "../app/usePageMeta";
import { RecommendationPanel } from "../components/content/RecommendationPanel";
import { RewardHub } from "../components/content/RewardHub";
import { RewardPopup } from "../components/content/RewardPopup";
import { Button } from "../components/ui/Button";
import { SectionHeader } from "../components/ui/SectionHeader";
import { useMockAuth } from "../features/profile/MockAuthContext";
import { useState } from "react";
import {
  mockFavoriteContent,
  mockNotificationItems,
  mockProfileStats,
  mockSavedClips,
  mockWatchHistory
} from "../features/profile/mockProfileData";
import { youtubeVideos } from "../data/youtubeFeed";
import { buildRecommendationSections } from "../lib/aiExperience";
import {
  dailyRewards,
  rewardBadges,
  rewardStreak,
  rewardSummary
} from "../data/rewards";

export function ProfilePage() {
  usePageMeta("Profile", "Saved clips, favorites, watch history, and profile stats for SNAILSLAYER viewers.");
  const { isAuthenticated, openAuth, logout, user } = useMockAuth();
  const recommendationSections = buildRecommendationSections(youtubeVideos, mockWatchHistory).slice(1, 3);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <section className="section section--page-start" data-reveal>
        <div className="container">
          <div className="profile-empty card">
            <span className="section-header__eyebrow">Profile</span>
            <h1>Your viewer dashboard starts here</h1>
            <p>Save clips, track favorites, and keep your MapleStory watch loop in one place.</p>
            <div className="profile-empty__actions">
              <button className="button button--primary" onClick={openAuth} type="button">
                Sign In
              </button>
              <Button href="/videos" variant="secondary">
                Browse Videos
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <RewardPopup
        note={rewardSummary.popupNote}
        onClose={() => setRewardClaimed(false)}
        title={rewardSummary.popupTitle}
        visible={rewardClaimed}
      />

      <section className="section section--page-start" data-reveal>
        <div className="container profile-hero">
          <div className="profile-hero__main card">
            <div className="profile-identity">
              <span className="profile-avatar" aria-hidden="true">
                {user.avatarLabel}
              </span>
              <div>
                <span className="section-header__eyebrow">Profile</span>
                <h1>{user.name}</h1>
                <p>{user.email}</p>
              </div>
            </div>
            <p className="profile-hero__copy">Saved clips, fresh watch history, and quick access to your favorite SNAILSLAYER content.</p>
            <div className="profile-hero__actions">
              <Button href="/live">Watch Live</Button>
              <Button href="/community" variant="secondary">Join Discord</Button>
              <button className="button button--ghost" onClick={logout} type="button">
                Sign Out
              </button>
            </div>
          </div>

          <div className="profile-stats-grid">
            {mockProfileStats.map((stat) => (
              <article className="card profile-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RewardHub
        badges={rewardBadges}
        currentStreak={rewardStreak.current}
        dailyRewards={dailyRewards}
        description="Claim the daily reward, keep your streak moving, and unlock the next badge."
        onClaim={() => setRewardClaimed(true)}
        targetStreak={rewardStreak.target}
        title="Reward track"
      />

      <section className="section section--tight" data-reveal>
        <div className="container">
          <SectionHeader title="Saved clips" description="Your quick return list." />
          <div className="profile-card-grid">
            {mockSavedClips.map((clip) => (
              <article className="card profile-content-card" key={clip.id}>
                <div className="profile-content-card__media">
                  {clip.thumbnail ? <img alt="" loading="lazy" src={clip.thumbnail} /> : null}
                  <span>{clip.tag}</span>
                </div>
                <div className="profile-content-card__body">
                  <h3>{clip.title}</h3>
                  <p>{clip.note}</p>
                  <div className="profile-content-card__meta">
                    <span>{clip.duration}</span>
                    <span>Saved</span>
                  </div>
                  <Button href={clip.href} variant="ghost">Open Clip</Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight" data-reveal>
        <div className="container two-column">
          <div className="profile-panel card">
            <SectionHeader title="Watch history" description="Pick up where you left off." />
            <div className="profile-history-list">
              {mockWatchHistory.map((item) => (
                <article className="profile-history-item" key={item.id}>
                  <div className="profile-history-item__top">
                    <strong>{item.title}</strong>
                    <span>{item.type}</span>
                  </div>
                  <div className="profile-history-item__meta">
                    <span>{item.watchedAt}</span>
                    <span>{item.progress}% watched</span>
                  </div>
                  <div className="profile-progress">
                    <span style={{ width: `${item.progress}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="profile-panel card">
            <SectionHeader title="Favorites" description="Your strongest picks." />
            <div className="profile-favorites-list">
              {mockFavoriteContent.map((item) => (
                <a className="profile-favorite-item" href={item.href} key={item.id} rel="noreferrer" target="_blank">
                  <span className="profile-favorite-item__thumb">
                    {item.thumbnail ? <img alt="" loading="lazy" src={item.thumbnail} /> : null}
                  </span>
                  <span className="profile-favorite-item__copy">
                    <strong>{item.title}</strong>
                    <small>{item.category}</small>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight" data-reveal>
        <div className="container">
          <div className="profile-panel card">
            <SectionHeader title="Alert settings" description="Ready for backend later." />
            <div className="profile-notifications">
              {mockNotificationItems.map((item) => (
                <div className="profile-notification-item" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                  </div>
                  <span className={`profile-toggle ${item.enabled ? "is-on" : ""}`}>
                    <span />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight" data-reveal>
        <div className="container">
          <RecommendationPanel sections={recommendationSections} />
        </div>
      </section>
    </>
  );
}
