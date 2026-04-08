import type { DailyReward, RewardBadge } from "../../data/rewards";

type RewardHubProps = {
  badges: RewardBadge[];
  currentStreak: number;
  dailyRewards: DailyReward[];
  description: string;
  onClaim: () => void;
  targetStreak: number;
  title: string;
};

export function RewardHub({
  badges,
  currentStreak,
  dailyRewards,
  description,
  onClaim,
  targetStreak,
  title
}: RewardHubProps) {
  const progress = Math.min((currentStreak / targetStreak) * 100, 100);
  const todayReward = dailyRewards.find((reward) => reward.today);

  return (
    <section className="section section--tight" data-reveal>
      <div className="container">
        <div className="reward-hub card">
          <div className="reward-hub__intro">
            <span className="section-header__eyebrow">Rewards</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <div className="reward-hub__grid">
            <article className="reward-card reward-card--claim">
              <span className="reward-card__label">Daily login</span>
              <strong>{todayReward?.reward || "Daily reward"}</strong>
              <p>Claim today's reward and keep the streak alive.</p>
              <button className="button button--primary" onClick={onClaim} type="button">
                {todayReward?.claimed ? "Claimed" : "Claim Reward"}
              </button>
            </article>

            <article className="reward-card reward-card--streak">
              <span className="reward-card__label">Streak</span>
              <strong>{currentStreak} day streak</strong>
              <p>{targetStreak} days unlock the weekly badge.</p>
              <div className="reward-progress" aria-label="Reward streak progress">
                <span style={{ width: `${progress}%` }} />
              </div>
              <div className="reward-days">
                {dailyRewards.map((reward) => (
                  <span
                    className={reward.claimed || reward.today ? "is-active" : ""}
                    key={reward.day}
                    title={`${reward.label}: ${reward.reward}`}
                  >
                    {reward.day}
                  </span>
                ))}
              </div>
            </article>

            <article className="reward-card reward-card--badges">
              <span className="reward-card__label">Badges</span>
              <strong>Unlocked and next up</strong>
              <div className="reward-badges">
                {badges.map((badge) => (
                  <div className={`reward-badge ${badge.unlocked ? "is-unlocked" : ""}`} key={badge.id}>
                    <span className="reward-badge__icon" aria-hidden="true">
                      {badge.icon}
                    </span>
                    <div className="reward-badge__copy">
                      <strong>{badge.title}</strong>
                      <small>{badge.note}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
