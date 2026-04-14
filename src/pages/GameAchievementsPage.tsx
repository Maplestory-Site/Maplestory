import { useMemo } from "react";
import { usePageMeta } from "../app/usePageMeta";
import { useGameMeta } from "../components/content/minigames/shared/useGameMeta";
import { ACHIEVEMENTS } from "../components/content/minigames/shared/achievements";
import { ProgressBar } from "../components/content/minigames/shared/ProgressBar";

export function GameAchievementsPage() {
  usePageMeta("Achievements", "Track progress, rewards, and milestones across the mini game platform.");
  const meta = useGameMeta();

  const progressData = useMemo(
    () =>
      ACHIEVEMENTS.map((achievement) => {
        const current = achievement.getProgress(meta);
        const target = achievement.target;
        const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
        return {
          ...achievement,
          current,
          progress,
          unlocked: meta.achievements.includes(achievement.id)
        };
      }),
    [meta]
  );

  return (
    <section className="section section--page-start" data-reveal>
      <div className="container achievements-page">
        <div className="achievements-hero card">
          <span className="section-header__eyebrow">Achievements</span>
          <h1>Goals, rewards, and milestones</h1>
          <p>Earn XP, coins, and badges by completing milestone objectives across every mini-game.</p>
        </div>

        <div className="achievements-grid">
          {progressData.map((achievement) => (
            <article className={`achievement-card ${achievement.unlocked ? "is-unlocked" : ""}`} key={achievement.id}>
              <div className="achievement-card__top">
                <strong>{achievement.title}</strong>
                <span>{achievement.unlocked ? "Unlocked" : "In progress"}</span>
              </div>
              <p>{achievement.description}</p>
              <ProgressBar
                label={`${Math.min(achievement.current, achievement.target)} / ${achievement.target}`}
                value={achievement.unlocked ? "Complete" : "Keep going"}
                progress={achievement.progress}
                accent={achievement.unlocked ? "gold" : "ember"}
              />
              <div className="achievement-card__rewards">
                <span>Rewards</span>
                <div>
                  <span>+{achievement.rewardXp} XP</span>
                  <span>+{achievement.rewardCoins} coins</span>
                  {achievement.rewardBadge ? <span>{achievement.rewardBadge}</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
