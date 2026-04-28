import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  formatNumber,
  getMissionProgressPct,
  getRetentionSummary,
  type ClassId,
  type ClassSkillId,
  type DatabaseMonster,
  type GlobalMultId,
  type IdleGameState,
  type MicroMission,
  type RelicUpgradeId,
  type WorldZone
} from "../gameEngine";
import {
  BOSS_SURGE_SECONDS,
  formatPowerRating,
  type MilestoneBonus
} from "../powerSpikeSystem";
import {
  RELIC_UPGRADES,
  getRelicUpgradeCost,
  type RebirthPreview,
  type RelicUpgradeDef
} from "../rebirthSystem";
import {
  GLOBAL_MULTIPLIERS,
  getGlobalMultCost
} from "../economySystem";
import {
  PREMIUM_CURRENCY_LABEL,
  SEASON_PASS_TIERS,
  SHOP_OFFERS,
  type MonetizationOfferId,
  type RewardedAdPlacement,
  type SeasonPassTrack
} from "../shopSystem";
import { CLASSES, getClassMaxHp } from "../classSystem";
import {
  BUILD_FOCUS_DEFINITIONS,
  getSkillBuildBonuses,
  getSelectedSkillBranch,
  getSkillBranchOptions,
  type BuildFocusId,
  type SkillBranchId
} from "../skillBuildSystem";
import {
  SKILL_DEFINITIONS,
  type SkillDefinition as ClassSkillDefinition
} from "../skillSystem";
import {
  DUNGEON_DEFINITIONS,
  getDungeonRunsLeft,
  type DungeonType
} from "../dungeonSystem";
import {
  ALL_ZONES,
  getZoneUnlockStatus,
  getZoneProgressSummary
} from "../zoneSystem";
import { sanitizeGameText, sanitizeMonsterPortrait } from "../textSanitizer";

function formatCompactTimer(seconds: number) {
  if (seconds <= 0) return "Ready";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s`;
}

function resolvePortraitGlyph(value: string | null | undefined) {
  return sanitizeMonsterPortrait(value, "👾");
}
export function CombatTab({
  state, isBoss, currentMonster, rebirthPreview,
  retentionSummary,
  onHunt, onRaid, onPrestige, onRebirth,
  onClaimDaily, onClaimComeback, onReadNotifications,
  powerRating, powerTier, nextMilestone, surgeSecondsLeft, dps,
  microMissions, onClaimMicroMission, activeShopBoosts
}: {
  state: IdleGameState;
  isBoss: boolean;
  currentMonster: DatabaseMonster | null;
  rebirthPreview: RebirthPreview;
  retentionSummary: ReturnType<typeof getRetentionSummary>;
  onHunt: () => void;
  onRaid: () => void;
  onPrestige: () => void;
  onRebirth: () => void;
  onClaimDaily: () => void;
  onClaimComeback: () => void;
  onReadNotifications: () => void;
  powerRating: number;
  powerTier: { color: string; label: string };
  nextMilestone: MilestoneBonus | null;
  surgeSecondsLeft: number;
  dps: number;
  microMissions: MicroMission[];
  onClaimMicroMission: (id: string) => void;
  activeShopBoosts: IdleGameState["shop"]["activeBoosts"];
}) {
  const dailyClaimed = !retentionSummary.dailyAvailable;
  const unreadCount = retentionSummary.unreadNotifications;
  const completedAchievements = retentionSummary.completedAchievements;
  const aiRecommendation = state.ai.upgradeRecommendations[0];
  const surgeActive = surgeSecondsLeft > 0;
  const dailyChallenges = retentionSummary.dailyChallenges;
  const dailyChallengesCompleted = retentionSummary.dailyChallengesCompleted;
  const dailyChallengeResetLabel = formatCompactTimer(retentionSummary.dailyChallengeResetSeconds);
  const weeklyGoal = retentionSummary.weeklyGoal;
  const weeklyGoalProgressPct = retentionSummary.weeklyGoalProgressPct;
  const weeklyGoalResetLabel = formatCompactTimer(retentionSummary.weeklyGoalResetSeconds);
  const comebackAvailable = retentionSummary.comebackRewardAvailable;
  const comebackReward = retentionSummary.comebackReward;
  const comebackAwayHours = retentionSummary.comebackAwayHours;
  const comebackAwayLabel = comebackAwayHours >= 24
    ? `${Math.floor(comebackAwayHours / 24)}d ${comebackAwayHours % 24}h`
    : `${comebackAwayHours}h`;

  return (
    <div className="isw-panel">

      {/* ── Power Rating card ─────────────────────────────────────────────── */}
      <div className="isw-power-card">
        <div className="isw-power-card__main">
          <span className="isw-power-card__label">Power Rating</span>
          <span className="isw-power-card__value" style={{ color: powerTier.color }}>
            {formatPowerRating(powerRating)}
          </span>
          <span className="isw-power-card__tier" style={{ color: powerTier.color }}>
            {powerTier.label}
          </span>
        </div>
        <div className="isw-power-card__stats">
          <div className="isw-power-card__stat">
            <span>DPS</span>
            <strong>{formatNumber(dps)}</strong>
          </div>
          <div className="isw-power-card__stat">
            <span>Level</span>
            <strong>{state.level}</strong>
          </div>
          <div className="isw-power-card__stat">
            <span>Prestige</span>
            <strong>{state.prestigeCount > 0 ? `x${state.prestigeCount}` : "-"}</strong>
          </div>
        </div>
        {/* Boss surge active bar */}
        {surgeActive && (
          <div className="isw-power-card__surge">
            <span className="isw-power-card__surge-label">BOSS SURGE x2 DPS</span>
            <div className="isw-power-card__surge-track">
              <motion.div
                className="isw-power-card__surge-fill"
                animate={{ width: `${(surgeSecondsLeft / BOSS_SURGE_SECONDS) * 100}%` }}
                transition={{ duration: 0.5, ease: "linear" }}
              />
              <span className="isw-power-card__surge-time">{Math.ceil(surgeSecondsLeft)}s</span>
            </div>
          </div>
        )}
        {/* Next milestone progress */}
        {nextMilestone && (
          <div className="isw-power-card__milestone">
            <span className="isw-power-card__milestone-label">
              {nextMilestone.icon} Lv.{nextMilestone.level} - {nextMilestone.label}
            </span>
            <span className="isw-power-card__milestone-desc">{nextMilestone.description}</span>
            <div className="isw-power-card__milestone-track">
              <div
                className="isw-power-card__milestone-fill"
                style={{
                  width: `${Math.min(100,
                    ((state.level - (nextMilestone.level - 5)) / 5) * 100
                  )}%`
                }}
              />
            </div>
            <span className="isw-power-card__milestone-lvs">
              {nextMilestone.level - state.level} levels away
            </span>
          </div>
        )}
      </div>

      <div className="isw-combat">
        <motion.button
          className={`isw-hunt-btn${surgeActive ? " is-surge" : ""}`}
          onClick={onHunt}
          whileTap={{ scale: 0.91, transition: { duration: 0.07, ease: "easeIn" } }}
          type="button"
        >
          Hunt {resolvePortraitGlyph(currentMonster?.portrait)}
        </motion.button>
        <motion.button
          className={`isw-action-btn${isBoss ? " is-boss-btn" : ""}`}
          onClick={onRaid}
          whileTap={{ scale: 0.94 }}
          type="button"
        >
          {isBoss ? "Boss Strike" : "Raid Boss"}
        </motion.button>
        <motion.button
          className={`isw-action-btn${rebirthPreview.canPrestige ? " is-ready" : ""}`}
          onClick={onPrestige}
          whileTap={{ scale: 0.94 }}
          type="button"
          title={rebirthPreview.prestigeReason}
        >
          Prestige
          {rebirthPreview.canPrestige ? " Ready" : ` (${Math.floor(state.crystals)}/8)`}
        </motion.button>
        <motion.button
          className={`isw-action-btn${rebirthPreview.canRebirth ? " is-ready" : ""}`}
          onClick={onRebirth}
          whileTap={{ scale: 0.94 }}
          type="button"
          title={rebirthPreview.rebirthReason}
        >
          Rebirth
          {rebirthPreview.canRebirth ? ` +${rebirthPreview.relicsOnRebirth} Relic` : ""}
        </motion.button>
      </div>

      {activeShopBoosts.length > 0 && (
        <div className="isw-boost-strip">
          {activeShopBoosts.map((boost) => (
            <div key={boost.id} className="isw-boost-pill">
              <span className="isw-boost-pill__icon">{sanitizeMonsterPortrait(boost.icon, "!")}</span>
              <div className="isw-boost-pill__body">
                <span className="isw-boost-pill__label">{sanitizeGameText(boost.label, "Boost")}</span>
                <span className="isw-boost-pill__time">{formatCompactTimer(boost.remainingSeconds)}</span>
              </div>
              <span className="isw-boost-pill__value">x{boost.multiplier.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="isw-upgrade-section">
        <div className="isw-section-head">
          <span className="isw-section-label">AI Assist</span>
          <span className="isw-section-sub">Auto skill {state.ai.autoSkillEnabled ? "on" : "off"}</span>
        </div>
        <div className="isw-shop-grid">
          <div className="isw-shop-card">
            <span className="isw-shop-card__name">Recommended upgrade</span>
            <span className="isw-shop-card__desc">
              {aiRecommendation ? aiRecommendation.reason : "No recommendation yet."}
            </span>
            <span className="isw-shop-card__cost">
              {aiRecommendation
                ? `${aiRecommendation.label} - ${formatNumber(aiRecommendation.cost)} ${aiRecommendation.currency}`
                : "Watching run"}
            </span>
          </div>
          <div className="isw-shop-card">
            <span className="isw-shop-card__name">Player behavior</span>
            <span className="isw-shop-card__desc">
              {state.behavior.totalActions} actions - {Math.floor(state.behavior.idleSeconds)}s idle
            </span>
            <span className="isw-shop-card__cost">Difficulty x{state.ai.adaptiveDifficulty.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Micro missions ─────────────────────────────────────────────── */}
      <div className="isw-upgrade-section">
        <div className="isw-section-head">
          <span className="isw-section-label">Missions</span>
          <span className="isw-section-sub">
            {microMissions.filter(m => m.completed && !m.claimed).length > 0
              ? `${microMissions.filter(m => m.completed && !m.claimed).length} ready!`
              : "Always refreshing"}
          </span>
        </div>
        <div className="isw-micro-missions">
          {microMissions.map(m => {
            const pct = getMissionProgressPct(m);
            const canClaim = m.completed && !m.claimed;
            return (
              <div key={m.id} className={`isw-mm-card${canClaim ? " is-done" : ""}`}>
                <span className="isw-mm-card__icon">{sanitizeMonsterPortrait(m.icon, "*")}</span>
                <div className="isw-mm-card__body">
                  <span className="isw-mm-card__label">{sanitizeGameText(m.label, "Mission")}</span>
                  <div className="isw-mm-card__track">
                    <div
                      className={`isw-mm-card__fill${canClaim ? " is-done" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="isw-mm-card__prog">
                    {m.progress >= m.target
                      ? "Complete!"
                      : `${formatNumber(m.progress)} / ${formatNumber(m.target)}`}
                  </span>
                </div>
                <div className="isw-mm-card__right">
                  <span className="isw-mm-card__reward">
                    +{formatNumber(m.reward.mesos)} Gold
                    {m.reward.crystals ? ` +${m.reward.crystals} Crystal` : ""}
                  </span>
                  {canClaim && (
                    <motion.button
                      className="isw-mm-card__claim"
                      onClick={() => onClaimMicroMission(m.id)}
                      whileTap={{ scale: 0.91 }}
                      type="button"
                    >
                      Claim
                    </motion.button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="isw-upgrade-section">
        <div className="isw-section-head">
          <span className="isw-section-label">Retention</span>
          <span className="isw-section-sub">{completedAchievements}/{retentionSummary.totalAchievements} achievements</span>
        </div>
        <div className="isw-shop-grid">
          <motion.button
            type="button"
            className={`isw-shop-card${dailyClaimed ? " is-owned" : ""}`}
            onClick={onClaimDaily}
            disabled={dailyClaimed}
            whileTap={!dailyClaimed ? { scale: 0.95 } : {}}
          >
            <span className="isw-shop-card__name">Daily Reward</span>
            <span className="isw-shop-card__desc">
              Streak {state.dailyReward.streak} - Cycle day {retentionSummary.dailyCycleDay}/7
            </span>
            <span className="isw-shop-card__cost">
              {dailyClaimed ? "Claimed today" : "Claim now"}
            </span>
          </motion.button>

          <motion.button
            type="button"
            className={`isw-shop-card${comebackAvailable ? " is-ready" : ""}`}
            onClick={onClaimComeback}
            disabled={!comebackAvailable}
            whileTap={comebackAvailable ? { scale: 0.95 } : {}}
          >
            <span className="isw-shop-card__name">Comeback Reward</span>
            <span className="isw-shop-card__desc">
              {comebackAvailable
                ? `Away ${comebackAwayLabel} · Welcome-back bonus ready`
                : "Unlocks after longer inactivity (18h+)"}
            </span>
            <span className="isw-shop-card__cost">
              {comebackAvailable && comebackReward
                ? `Claim ${formatNumber(comebackReward.mesos)} mesos`
                : "Not available"}
            </span>
          </motion.button>

          <motion.button
            type="button"
            className={`isw-shop-card${unreadCount ? " is-ready" : ""}`}
            onClick={onReadNotifications}
            disabled={!unreadCount}
            whileTap={unreadCount ? { scale: 0.95 } : {}}
          >
            <span className="isw-shop-card__name">Notifications</span>
            <span className="isw-shop-card__desc">Future-ready event inbox</span>
            <span className="isw-shop-card__cost">{unreadCount} unread</span>
          </motion.button>
        </div>

        <div className="isw-retention-block">
          <div className="isw-retention-block__head">
            <span>Daily challenges</span>
            <small>{dailyChallengesCompleted}/{dailyChallenges.length} done · resets in {dailyChallengeResetLabel}</small>
          </div>
          {dailyChallenges.length > 0 ? (
            <div className="isw-retention-list">
              {dailyChallenges.map((challenge) => {
                const pct = Math.max(0, Math.min(100, (challenge.progress / Math.max(1, challenge.target)) * 100));
                return (
                  <div key={`${challenge.challengeId}-${challenge.slot}`} className={`isw-retention-item${challenge.completed ? " is-done" : ""}`}>
                    <div className="isw-retention-item__top">
                      <strong>{challenge.label}</strong>
                      <span>{formatNumber(challenge.progress)} / {formatNumber(challenge.target)}</span>
                    </div>
                    <div className="isw-retention-item__track">
                      <div className="isw-retention-item__fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="isw-retention-item__bottom">
                      <span>Reward {formatNumber(challenge.reward.mesos)} mesos{challenge.reward.crystals > 0 ? ` · ${challenge.reward.crystals} crystals` : ""}</span>
                      <span>{challenge.completed ? "Rewarded" : "In progress"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="isw-retention-empty">Daily challenges are preparing.</div>
          )}
        </div>

        <div className="isw-retention-block">
          <div className="isw-retention-block__head">
            <span>Weekly goal</span>
            <small>
              {weeklyGoal.milestoneClaims.length}/3 milestones · resets in {weeklyGoalResetLabel}
            </small>
          </div>
          <div className={`isw-retention-item${weeklyGoal.completed ? " is-done" : ""}`}>
            <div className="isw-retention-item__top">
              <strong>{weeklyGoal.label}</strong>
              <span>{formatNumber(weeklyGoal.progress)} / {formatNumber(weeklyGoal.target)}</span>
            </div>
            <div className="isw-retention-item__track">
              <div className="isw-retention-item__fill is-weekly" style={{ width: `${weeklyGoalProgressPct}%` }} />
            </div>
            <div className="isw-retention-item__bottom">
              <span>Total reward {formatNumber(weeklyGoal.reward.mesos)} mesos · {weeklyGoal.reward.crystals} crystals</span>
              <span>{weeklyGoal.completed ? "Completed this week" : "Milestones auto-claim"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShopTab({
  state,
  rewardedAdCooldowns,
  claimableFreePassTiers,
  claimablePremiumPassTiers,
  onBuyShopOffer,
  onWatchRewardedAd,
  onClaimSeasonPassTier
}: {
  state: IdleGameState;
  rewardedAdCooldowns: Record<RewardedAdPlacement, number>;
  claimableFreePassTiers: number[];
  claimablePremiumPassTiers: number[];
  onBuyShopOffer: (offerId: MonetizationOfferId) => void;
  onWatchRewardedAd: (placement: RewardedAdPlacement) => void;
  onClaimSeasonPassTier: (tierNumber: number, track: SeasonPassTrack) => void;
}) {
  const dailyOfferIds = new Set(state.shop.dailyDeals.map((deal) => deal.offerId));
  const activePassClaims = claimableFreePassTiers.length + claimablePremiumPassTiers.length;

  return (
    <div className="isw-panel">
      <div className="isw-monetization">
        <div className="isw-monetization__wallet">
          <div className="isw-monetization__wallet-card">
            <span className="isw-monetization__label">{PREMIUM_CURRENCY_LABEL}</span>
            <strong className="isw-monetization__value">{formatNumber(state.crystals)}</strong>
            <small className="isw-monetization__hint">Fair premium currency earned from bosses, events and pass.</small>
          </div>
          <div className="isw-monetization__wallet-card">
            <span className="isw-monetization__label">Active boosts</span>
            <strong className="isw-monetization__value">{state.shop.activeBoosts.length}</strong>
            <small className="isw-monetization__hint">
              {state.shop.activeBoosts.length > 0
                ? state.shop.activeBoosts.map((boost) => boost.label).slice(0, 2).join(" · ")
                : "No temporary boosts active"}
            </small>
          </div>
          <div className="isw-monetization__wallet-card">
            <span className="isw-monetization__label">Season pass</span>
            <strong className="isw-monetization__value">{state.shop.seasonPass.progress}</strong>
            <small className="isw-monetization__hint">
              {state.shop.seasonPass.premiumUnlocked
                ? `${activePassClaims} rewards ready`
                : "Premium track optional only"}
            </small>
          </div>
        </div>

        {state.shop.activeBoosts.length > 0 && (
          <div className="isw-boost-strip is-inline">
            {state.shop.activeBoosts.map((boost) => (
              <div key={boost.id} className="isw-boost-pill">
                <span className="isw-boost-pill__icon">{boost.icon}</span>
                <div className="isw-boost-pill__body">
                  <span className="isw-boost-pill__label">{boost.label}</span>
                  <span className="isw-boost-pill__time">{formatCompactTimer(boost.remainingSeconds)}</span>
                </div>
                <span className="isw-boost-pill__value">x{boost.multiplier.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="isw-upgrade-section">
          <div className="isw-section-head">
            <span className="isw-section-label">Daily deals</span>
            <span className="isw-section-sub">Discounted convenience, refreshed daily</span>
          </div>
          <div className="isw-shop-grid">
            {state.shop.dailyDeals.map((deal) => {
              const offer = SHOP_OFFERS[deal.offerId];
              const canBuy = state.crystals >= deal.priceCrystals;
              return (
                <motion.button
                  key={deal.slotId}
                  type="button"
                  className={`isw-shop-card${canBuy ? " is-ready" : ""}`}
                  onClick={() => onBuyShopOffer(deal.offerId)}
                  whileTap={{ scale: 0.96 }}
                >
                  <span className="isw-shop-card__name">{offer.icon} {offer.title}</span>
                  <span className="isw-shop-card__desc">{offer.subtitle}</span>
                  <span className="isw-shop-card__cost">
                    {deal.discountPct}% off · {deal.priceCrystals} {PREMIUM_CURRENCY_LABEL}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="isw-upgrade-section">
          <div className="isw-section-head">
            <span className="isw-section-label">Boosters & bundles</span>
            <span className="isw-section-sub">Optional convenience only</span>
          </div>
          <div className="isw-shop-grid">
            {Object.values(SHOP_OFFERS)
              .filter((offer) => offer.section === "bundles" || offer.section === "boosters")
              .map((offer) => {
                const dailyPrice = state.shop.dailyDeals.find((deal) => deal.offerId === offer.id)?.priceCrystals;
                const price = dailyPrice ?? offer.costCrystals;
                const canBuy = state.crystals >= price;
                return (
                  <motion.button
                    key={offer.id}
                    type="button"
                    className={`isw-shop-card${canBuy ? " is-ready" : ""}${dailyOfferIds.has(offer.id) ? " is-owned" : ""}`}
                    onClick={() => onBuyShopOffer(offer.id)}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span className="isw-shop-card__name">{offer.icon} {offer.title}</span>
                    <span className="isw-shop-card__desc">{offer.subtitle}</span>
                    <span className="isw-shop-card__cost">
                      {price} {PREMIUM_CURRENCY_LABEL}
                      {offer.durationSeconds ? ` · ${formatCompactTimer(offer.durationSeconds)}` : ""}
                    </span>
                  </motion.button>
                );
              })}
          </div>
        </div>

        <div className="isw-upgrade-section">
          <div className="isw-section-head">
            <span className="isw-section-label">Rewarded ads</span>
            <span className="isw-section-sub">Optional boosts, never forced</span>
          </div>
          <div className="isw-shop-grid">
            {([
              { id: "double_rewards", title: "Double Rewards", icon: "AD", desc: "Instant mesos + crystals after a short rewarded ad." },
              { id: "free_chest", title: "Free Chest", icon: "CHEST", desc: "Claim a free chest with mesos and a relic chance." },
              { id: "boost_trial", title: "Boost Trial", icon: "BOOST", desc: "Try an XP boost without spending premium currency." }
            ] as const).map((ad) => {
              const cooldown = rewardedAdCooldowns[ad.id];
              const ready = cooldown <= 0;
              return (
                <motion.button
                  key={ad.id}
                  type="button"
                  className={`isw-shop-card${ready ? " is-ready" : ""}`}
                  onClick={() => onWatchRewardedAd(ad.id)}
                  whileTap={ready ? { scale: 0.96 } : {}}
                >
                  <span className="isw-shop-card__name">{ad.icon} {ad.title}</span>
                  <span className="isw-shop-card__desc">{ad.desc}</span>
                  <span className="isw-shop-card__cost">{ready ? "Watch now" : formatCompactTimer(cooldown)}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="isw-upgrade-section">
          <div className="isw-section-head">
            <span className="isw-section-label">Season pass</span>
            <span className="isw-section-sub">Free path stays strong, premium adds extra rewards</span>
          </div>
          <div className="isw-monetization__pass-track">
            <div className="isw-monetization__pass-progress">
              <div className="isw-monetization__pass-fill" style={{ width: `${Math.min(100, (state.shop.seasonPass.progress / 50) * 100)}%` }} />
            </div>
            <span className="isw-monetization__pass-meta">
              {state.shop.seasonPass.progress}/50 progress · {state.shop.seasonPass.premiumUnlocked ? "Premium unlocked" : "Premium optional"}
            </span>
          </div>
          {!state.shop.seasonPass.premiumUnlocked && (
            <motion.button
              type="button"
              className="isw-monetization__cta"
              onClick={() => onBuyShopOffer("premium_track")}
              whileTap={{ scale: 0.97 }}
            >
              Unlock Premium Track · {SHOP_OFFERS.premium_track.costCrystals} {PREMIUM_CURRENCY_LABEL}
            </motion.button>
          )}
          <div className="isw-monetization__pass-list">
            {SEASON_PASS_TIERS.map((tier) => {
              const freeReady = claimableFreePassTiers.includes(tier.tier);
              const premiumReady = claimablePremiumPassTiers.includes(tier.tier);
              const unlocked = state.shop.seasonPass.progress >= tier.requiredProgress;
              return (
                <div key={tier.tier} className={`isw-monetization__pass-row${unlocked ? " is-ready" : ""}`}>
                  <div className="isw-monetization__pass-tier">
                    <strong>Tier {tier.tier}</strong>
                    <small>{tier.requiredProgress} progress</small>
                  </div>
                  <div className="isw-monetization__track">
                    <span>Free</span>
                    <small>
                      {tier.free.crystals ? `+${tier.free.crystals} Crystals ` : ""}
                      {tier.free.mesos ? `+${formatNumber(tier.free.mesos)} Mesos ` : ""}
                      {tier.free.relics ? `+${tier.free.relics} Relics ` : ""}
                      {tier.free.fame ? `+${tier.free.fame} Fame ` : ""}
                      {tier.free.boostOfferId ? SHOP_OFFERS[tier.free.boostOfferId].title : ""}
                    </small>
                    <motion.button
                      type="button"
                      className={`isw-monetization__mini-btn${freeReady ? " is-ready" : ""}`}
                      onClick={() => onClaimSeasonPassTier(tier.tier, "free")}
                      whileTap={freeReady ? { scale: 0.96 } : {}}
                      disabled={!freeReady}
                    >
                      {freeReady ? "Claim" : "Locked"}
                    </motion.button>
                  </div>
                  <div className="isw-monetization__track">
                    <span>Premium</span>
                    <small>
                      {tier.premium.crystals ? `+${tier.premium.crystals} Crystals ` : ""}
                      {tier.premium.mesos ? `+${formatNumber(tier.premium.mesos)} Mesos ` : ""}
                      {tier.premium.relics ? `+${tier.premium.relics} Relics ` : ""}
                      {tier.premium.fame ? `+${tier.premium.fame} Fame ` : ""}
                      {tier.premium.boostOfferId ? SHOP_OFFERS[tier.premium.boostOfferId].title : ""}
                    </small>
                    <motion.button
                      type="button"
                      className={`isw-monetization__mini-btn${premiumReady ? " is-ready" : ""}`}
                      onClick={() => onClaimSeasonPassTier(tier.tier, "premium")}
                      whileTap={premiumReady ? { scale: 0.96 } : {}}
                      disabled={!premiumReady}
                    >
                      {premiumReady ? "Claim" : state.shop.seasonPass.premiumUnlocked ? "Locked" : "Premium"}
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CLASS PICK TAB ───────────────────────────────────────────────────────────

export function ClassPickTab({ onSelect }: { onSelect: (id: ClassId) => void }) {
  return (
    <div className="isw-panel">
      <div className="isw-class-pick">
        <p className="isw-class-pick__hint">Choose your class</p>
        <div className="isw-class-cards">
          {Object.values(CLASSES).map(cls => (
            <motion.button
              key={cls.id}
              className="isw-class-card"
              onClick={() => onSelect(cls.id)}
              style={{ borderColor: cls.color + "55" }}
              whileTap={{ scale: 0.93 }}
              type="button"
            >
              <span className="isw-class-card__icon">{cls.icon}</span>
              <span className="isw-class-card__name" style={{ color: cls.color }}>{cls.name}</span>
              <span className="isw-class-card__role">{cls.description}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CLASS PANEL TAB ──────────────────────────────────────────────────────────

export function ClassTab({
  state, skills, maxResource, resourcePct, regenMult, level, onActivate, onSwitch, onSetBuildFocus, onSetSkillBranch
}: {
  state: IdleGameState;
  skills: ClassSkillDefinition[];
  maxResource: number;
  resourcePct: number;
  regenMult: number;
  level: number;
  onActivate: (id: ClassSkillId) => void;
  onSwitch: (id: ClassId) => void;
  onSetBuildFocus: (id: BuildFocusId) => void;
  onSetSkillBranch: (skillId: ClassSkillId, branchId: SkillBranchId) => void;
}) {
  if (!state.classId) return null;
  const cls = CLASSES[state.classId];
  const resName = cls.resource === "mana" ? "Mana" : "Rage";
  const maxHp = getClassMaxHp(state.classId, level);
  const buildBonuses = getSkillBuildBonuses(state);

  return (
    <div className="isw-panel">
      <div className="isw-class-panel">
        {/* Header */}
        <div className="isw-class-header">
          <span className="isw-class-header__icon">{cls.icon}</span>
          <div className="isw-class-header__info">
            <span className="isw-class-header__name" style={{ color: cls.color }}>{cls.name}</span>
            <span className="isw-class-header__passive">{cls.passive.name} · {cls.passive.description}</span>
          </div>
          <span className="isw-class-header__hp">HP {formatNumber(maxHp)}</span>
          <motion.button
            type="button"
            className="isw-section-best"
            style={{ marginLeft: 4 }}
            onClick={() => onSwitch(state.classId === "warrior" ? "mage" : state.classId === "mage" ? "archer" : "warrior")}
            whileTap={{ scale: 0.93 }}
          >
            Switch
          </motion.button>
        </div>

        {/* Resource bar */}
        <div>
          <div className="isw-resource-label">
            <span>{resName} {Math.floor(state.resource)} / {maxResource}</span>
            {regenMult > 1 && <span>Regen x{regenMult.toFixed(1)}</span>}
          </div>
          <div className="isw-resource-bar">
            <div
              className={`isw-resource-fill isw-resource-fill--${cls.resource}`}
              style={{ width: `${resourcePct}%` }}
            />
          </div>
        </div>

        <div className="isw-build-focuses">
          {Object.values(BUILD_FOCUS_DEFINITIONS).map((focus) => (
            <motion.button
              key={focus.id}
              type="button"
              className={`isw-build-focus${state.buildFocus === focus.id ? " is-active" : ""}`}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSetBuildFocus(focus.id)}
            >
              <span>{focus.name}</span>
              <small>{focus.summary}</small>
            </motion.button>
          ))}
        </div>

        {/* Active buffs */}
        {state.activeBuffs.length > 0 && (
          <div className="isw-buffs">
            <AnimatePresence>
              {state.activeBuffs.map(buff => (
                <motion.span
                  key={buff.skillId}
                  className="isw-buff-badge"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                >
                  {SKILL_DEFINITIONS[buff.skillId]?.icon ?? "*"}{" "}
                  {SKILL_DEFINITIONS[buff.skillId]?.name ?? buff.skillId}{" "}
                  {buff.effectType === "buff_crit"
                    ? `x${buff.charges}`
                    : `${Math.ceil(buff.remainingSeconds)}s`}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Skills */}
        <div className="isw-skills">
          {skills.map(skill => {
            const locked = level < skill.unlockLevel;
            const cd = state.skillCooldowns[skill.id] ?? 0;
            const onCd = cd > 0;
            const skillCost = Math.max(0, Math.floor(skill.resourceCost * buildBonuses.resourceCostMult));
            const canAfford = state.resource >= skillCost;
            const isReady = !locked && !onCd && canAfford;
            const skillCooldown = Math.max(4, Math.round(SKILL_DEFINITIONS[skill.id].cooldown / buildBonuses.cooldownRecoveryMult));
            const cdPct = onCd ? (1 - cd / skillCooldown) * 100 : 0;
            const resName2 = state.classId === "mage" ? "mana" : "rage";
            const selectedBranch = getSelectedSkillBranch(state, skill.id);
            const branches = getSkillBranchOptions(skill.id);
            const status = locked
              ? `Lv.${skill.unlockLevel}`
              : onCd ? `${Math.ceil(cd)}s`
              : !canAfford ? `${skillCost} ${resName2}`
              : "Ready";

            return (
              <motion.div
                key={skill.id}
                className={`isw-skill-card${locked ? " is-locked" : onCd ? " is-cooldown" : isReady ? " is-ready" : ""}`}
                whileTap={!locked && !onCd && canAfford ? { scale: 0.93 } : {}}
                onClick={() => !locked && !onCd && canAfford && onActivate(skill.id)}
              >
                <span className="isw-skill-card__icon">{skill.icon}</span>
                <span className="isw-skill-card__name">{skill.name}</span>
                <span className="isw-skill-card__status">{status}</span>
                <div className="isw-skill-branches">
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      className={`isw-skill-branch${selectedBranch?.id === branch.id ? " is-active" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSetSkillBranch(skill.id, branch.id);
                      }}
                    >
                      {branch.name}
                    </button>
                  ))}
                </div>
                {onCd && (
                  <div className="isw-skill-card__cd-track">
                    <div className="isw-skill-card__cd-fill" style={{ width: `${cdPct}%` }} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ECONOMY TAB ──────────────────────────────────────────────────────────────

export function EconomyTab({
  state, preview, incomePerSec, isCapped,
  onBuyGlobalMult, onUpgradeRelic, onPrestige, onRebirth
}: {
  state: IdleGameState;
  preview: RebirthPreview;
  incomePerSec: number;
  isCapped: boolean;
  onBuyGlobalMult: (id: GlobalMultId) => void;
  onUpgradeRelic: (id: RelicUpgradeId) => void;
  onPrestige: () => void;
  onRebirth: () => void;
}) {
  return (
    <div className="isw-panel">
      <div className="isw-economy">

        {/* Income summary */}
        <div className="isw-income-row">
          <div className="isw-income-chip">
            <span className="isw-income-chip__val" style={{ color: "var(--gold)" }}>
              {formatNumber(incomePerSec)}/s{isCapped ? " (cap)" : ""}
            </span>
            <span className="isw-income-chip__lbl">Gold Income</span>
          </div>
          <div className="isw-income-chip">
            <span className="isw-income-chip__val" style={{ color: "var(--crystal)" }}>
              {Math.floor(state.crystals)}/500
            </span>
            <span className="isw-income-chip__lbl">Crystals</span>
          </div>
          <div className="isw-income-chip">
            <span className="isw-income-chip__val" style={{ color: "var(--relic)" }}>
              {formatNumber(state.relics)}
            </span>
            <span className="isw-income-chip__lbl">Relics</span>
          </div>
        </div>

        {/* Global Multipliers */}
        <div className="isw-upgrade-section">
          <div className="isw-section-head">
            <span className="isw-section-label">Global Multipliers</span>
            <span style={{ fontSize: 10, color: "var(--crystal)" }}>Crystals</span>
          </div>
          <div className="isw-mult-grid">
            {(Object.keys(GLOBAL_MULTIPLIERS) as GlobalMultId[]).map(id => {
              const def = GLOBAL_MULTIPLIERS[id];
              const lv = state.globalMults[id];
              const cost = getGlobalMultCost(id, lv);
              const ok = state.crystals >= cost;
              const maxed = lv >= def.maxLevel;
              return (
                <div key={id} className="isw-mult-card">
                  <span className="isw-mult-card__icon">{def.icon}</span>
                  <span className="isw-mult-card__name">{def.name}</span>
                  <span className="isw-mult-card__desc">{def.description}</span>
                  <span className="isw-mult-card__lv">Lv.{lv}/{def.maxLevel}</span>
                  <motion.button
                    type="button"
                    className={`isw-mult-card__btn${maxed ? " maxed" : ok ? " can-afford" : ""}`}
                    onClick={() => !maxed && onBuyGlobalMult(id)}
                    whileTap={!maxed ? { scale: 0.93 } : {}}
                  >
                    {maxed ? "Max" : `${formatNumber(cost)} Crystals`}
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Relic Upgrades */}
        <div className="isw-upgrade-section">
          <div className="isw-section-head">
            <span className="isw-section-label">Relic Upgrades</span>
            <span style={{ fontSize: 10, color: "var(--relic)" }}>Permanent</span>
          </div>
          <div className="isw-mult-grid">
            {(Object.values(RELIC_UPGRADES) as RelicUpgradeDef[]).map(def => {
              const lv = state.relicUpgrades[def.id];
              const cost = getRelicUpgradeCost(def.id, lv);
              const ok = state.relics >= cost;
              const maxed = lv >= def.maxLevel;
              return (
                <div key={def.id} className="isw-mult-card">
                  <span className="isw-mult-card__icon">{def.icon}</span>
                  <span className="isw-mult-card__name">{def.name}</span>
                  <span className="isw-mult-card__desc">{def.description}</span>
                  <span className="isw-mult-card__lv">Lv.{lv}/{def.maxLevel}</span>
                  <motion.button
                    type="button"
                    className={`isw-mult-card__btn${maxed ? " maxed" : ok ? " can-afford" : ""}`}
                    onClick={() => !maxed && onUpgradeRelic(def.id)}
                    whileTap={!maxed ? { scale: 0.93 } : {}}
                  >
                    {maxed ? "Max" : `${cost} Relics`}
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prestige / Rebirth */}
        <div className="isw-rebirth-section">
          <div className="isw-rebirth-row">
            <div className="isw-rebirth-row__info">
              <div className="isw-rebirth-row__title">Prestige x{state.prestigeCount + 1}</div>
              <div className="isw-rebirth-row__reason">{preview.prestigeReason}</div>
              <div className="isw-rebirth-row__hint">Keeps: crystals (50 %), fame, class, global mults</div>
            </div>
            <motion.button
              type="button"
              className={`isw-rebirth-btn${preview.canPrestige ? " is-ready" : ""}`}
              onClick={onPrestige}
              whileTap={{ scale: 0.93 }}
            >
              Prestige
            </motion.button>
          </div>
          <div className="isw-rebirth-row">
            <div className="isw-rebirth-row__info">
              <div className="isw-rebirth-row__title">Rebirth x{state.rebirthCount + 1}</div>
              <div className="isw-rebirth-row__reason">{preview.rebirthReason}</div>
              <div className="isw-rebirth-row__hint">Resets everything - relics are permanent</div>
            </div>
            <motion.button
              type="button"
              className={`isw-rebirth-btn is-rebirth${preview.canRebirth ? " is-ready" : ""}`}
              onClick={onRebirth}
              whileTap={{ scale: 0.93 }}
            >
              Rebirth
            </motion.button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── ZONE TAB ─────────────────────────────────────────────────────────────────

export function ZoneTab({
  state, progress, onChangeZone, onStartDungeon, setToast
}: {
  state: IdleGameState;
  progress: ReturnType<typeof getZoneProgressSummary>;
  onChangeZone: (z: WorldZone) => void;
  onStartDungeon: (type: DungeonType) => void;
  setToast: (msg: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleZones = showAll ? ALL_ZONES : ALL_ZONES.slice(0, 8);

  return (
    <div className="isw-panel">
      <div className="isw-zones">
        <div className="isw-dungeons">
          {Object.values(DUNGEON_DEFINITIONS).map((dungeon) => {
            const runsLeft = getDungeonRunsLeft(state.dungeonState, dungeon.id);
            const locked = state.level < dungeon.unlockLevel;
            const active = state.dungeonState.activeRun?.type === dungeon.id;
            return (
              <motion.button
                key={dungeon.id}
                type="button"
                className={`isw-dungeon-card${active ? " is-active" : ""}${locked ? " is-locked" : ""}`}
                onClick={() => onStartDungeon(dungeon.id)}
                whileTap={!locked ? { scale: 0.98 } : {}}
              >
                <div className="isw-dungeon-card__head">
                  <span className="isw-dungeon-card__icon">{dungeon.icon}</span>
                  <div>
                    <div className="isw-dungeon-card__name">{dungeon.name}</div>
                    <div className="isw-dungeon-card__meta">
                      {locked ? `Unlock Lv.${dungeon.unlockLevel}` : `${runsLeft}/${dungeon.runsPerDay} runs left`}
                    </div>
                  </div>
                </div>
                <div className="isw-dungeon-card__desc">{dungeon.description}</div>
                <div className="isw-dungeon-card__foot">
                  <span>{dungeon.totalWaves} waves</span>
                  <span>{active ? "Running" : dungeon.rewardLabel}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
        {/* Progress */}
        <div className="isw-zones__progress">
          <div className="isw-zones__progress-bar">
            <div className="isw-zones__progress-fill" style={{ width: `${progress.progressPct}%` }} />
          </div>
          <span className="isw-zones__progress-text">{progress.unlockedCount}/{progress.totalZones}</span>
        </div>
        {progress.nextLocked && (
          <div className="isw-zones__hint">
            Next: {progress.nextLocked.name}
            {progress.levelsToNext > 0 ? ` - ${progress.levelsToNext} levels away` : ""}
            {progress.prestigesToNext > 0 ? ` - Prestige x${progress.nextLocked.prestigeRequired}` : ""}
          </div>
        )}
        {/* Zone list */}
        <div className="isw-zones__list">
          <AnimatePresence>
            {visibleZones.map((z, i) => {
              const status = getZoneUnlockStatus(z, state);
              const isActive = z.id === state.zone;
              const locked = !status.unlocked;
              return (
                <motion.button
                  key={z.id}
                  type="button"
                  className={`isw-zone-btn${isActive ? " is-active" : ""}${locked ? " is-locked" : ""}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ ["--zone-color" as string]: z.color }}
                  onClick={() => {
                    if (locked) {
                      setToast(`Locked: ${locked ? status.reason : z.name}`);
                    } else {
                      onChangeZone(z);
                    }
                  }}
                  whileTap={!locked ? { scale: 0.97 } : {}}
                  aria-disabled={locked}
                >
                  <span className="isw-zone-btn__icon">{locked ? "LOCK" : (isActive ? z.bossIcon : "GO")}</span>
                  <div className="isw-zone-btn__info">
                    <div className="isw-zone-btn__name">{z.name}</div>
                    {locked
                      ? <div className="isw-zone-btn__lock-reason">{status.reason}</div>
                      : <div className="isw-zone-btn__meta">{z.region} · {z.description.slice(0, 40)}</div>
                    }
                  </div>
                  {!locked && (
                    <span className="isw-zone-btn__boost">x{z.rewardBoost.toFixed(1)}</span>
                  )}
                  {isActive && <span className="isw-zone-btn__here">Here</span>}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
        <button
          type="button"
          className="isw-zones__more-btn"
          onClick={() => setShowAll(s => !s)}
        >
          {showAll ? "Show less" : `Show all ${ALL_ZONES.length} zones`}
        </button>
      </div>
    </div>
  );
}


