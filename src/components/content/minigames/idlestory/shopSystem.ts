/**
 * IdleStory World — Shop & Monetization System
 *
 * Fair monetization for a mobile idle RPG:
 * - premium currency uses grindable crystals
 * - shop offers are convenience-focused
 * - boosts are temporary and optional
 * - rewarded ads are simulated locally and future-ready for API swap
 * - seasonal premium track grants extra rewards without hard-gating progress
 */

import type { IdleGameState } from "./gameEngine";
import { defaultRng } from "./seededRng";

export type ShopSectionId =
  | "daily_deals"
  | "bundles"
  | "boosters"
  | "battle_pass"
  | "rewarded";

export type MonetizationOfferId =
  | "gold_cache"
  | "gold_vault"
  | "xp_tonic"
  | "gold_rush"
  | "swift_sigil"
  | "loot_lens"
  | "premium_track";

export type MonetizationBoostType = "xp" | "gold" | "attack_speed" | "loot";
export type SeasonPassTrack = "free" | "premium";
export type RewardedAdPlacement = "double_rewards" | "free_chest" | "boost_trial";

export type ActiveMonetizationBoost = {
  id: string;
  offerId: MonetizationOfferId;
  type: MonetizationBoostType;
  label: string;
  icon: string;
  multiplier: number;
  remainingSeconds: number;
  source: "shop" | "ad" | "season_pass";
};

export type DailyDeal = {
  slotId: string;
  offerId: MonetizationOfferId;
  priceCrystals: number;
  discountPct: number;
  expiresAt: number;
};

export type RewardedAdState = {
  lastClaimedAt: Partial<Record<RewardedAdPlacement, number>>;
};

export type SeasonPassTierReward = {
  mesos?: number;
  crystals?: number;
  relics?: number;
  fame?: number;
  boostOfferId?: MonetizationOfferId;
};

export type SeasonPassTier = {
  tier: number;
  requiredProgress: number;
  free: SeasonPassTierReward;
  premium: SeasonPassTierReward;
};

export type SeasonPassState = {
  premiumUnlocked: boolean;
  progress: number;
  weekKey: string;
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
};

export type ShopState = {
  dailyDeals: DailyDeal[];
  activeBoosts: ActiveMonetizationBoost[];
  rewardedAds: RewardedAdState;
  seasonPass: SeasonPassState;
  lastDailyKey: string;
};

export type ShopOfferDef = {
  id: MonetizationOfferId;
  section: ShopSectionId;
  title: string;
  subtitle: string;
  icon: string;
  costCrystals: number;
  kind: "bundle" | "boost" | "unlock";
  oneTime?: boolean;
  durationSeconds?: number;
  boostType?: MonetizationBoostType;
  multiplier?: number;
};

export type ShopBoostMultipliers = {
  xpMult: number;
  goldMult: number;
  attackSpeedMult: number;
  lootDropMult: number;
  lootRarityBonus: number;
};

export const PREMIUM_CURRENCY_LABEL = "Crystals";
export const REWARDED_AD_COOLDOWNS: Record<RewardedAdPlacement, number> = {
  double_rewards: 60 * 12,
  free_chest: 60 * 20,
  boost_trial: 60 * 30
};

export const SHOP_OFFERS: Record<MonetizationOfferId, ShopOfferDef> = {
  gold_cache: {
    id: "gold_cache",
    section: "bundles",
    title: "Gold Cache",
    subtitle: "Quick gold burst scaled to your current run.",
    icon: "💰",
    costCrystals: 10,
    kind: "bundle"
  },
  gold_vault: {
    id: "gold_vault",
    section: "bundles",
    title: "Gold Vault",
    subtitle: "A larger stash for catch-up and convenience.",
    icon: "🏦",
    costCrystals: 24,
    kind: "bundle"
  },
  xp_tonic: {
    id: "xp_tonic",
    section: "boosters",
    title: "XP Tonic",
    subtitle: "+50% XP for 30 minutes.",
    icon: "✨",
    costCrystals: 18,
    kind: "boost",
    durationSeconds: 60 * 30,
    boostType: "xp",
    multiplier: 1.5
  },
  gold_rush: {
    id: "gold_rush",
    section: "boosters",
    title: "Gold Rush",
    subtitle: "+50% mesos for 30 minutes.",
    icon: "🪙",
    costCrystals: 18,
    kind: "boost",
    durationSeconds: 60 * 30,
    boostType: "gold",
    multiplier: 1.5
  },
  swift_sigil: {
    id: "swift_sigil",
    section: "boosters",
    title: "Swift Sigil",
    subtitle: "+20% attack speed for 20 minutes.",
    icon: "⚡",
    costCrystals: 22,
    kind: "boost",
    durationSeconds: 60 * 20,
    boostType: "attack_speed",
    multiplier: 1.2
  },
  loot_lens: {
    id: "loot_lens",
    section: "boosters",
    title: "Loot Lens",
    subtitle: "Higher loot chance and rarity for 25 minutes.",
    icon: "🎁",
    costCrystals: 20,
    kind: "boost",
    durationSeconds: 60 * 25,
    boostType: "loot",
    multiplier: 1.35
  },
  premium_track: {
    id: "premium_track",
    section: "battle_pass",
    title: "Premium Track",
    subtitle: "Unlock extra seasonal rewards. Convenience only.",
    icon: "👑",
    costCrystals: 120,
    kind: "unlock",
    oneTime: true
  }
};

export const SEASON_PASS_TIERS: SeasonPassTier[] = [
  { tier: 1, requiredProgress: 4, free: { mesos: 1500 }, premium: { crystals: 6 } },
  { tier: 2, requiredProgress: 8, free: { crystals: 4 }, premium: { mesos: 3500 } },
  { tier: 3, requiredProgress: 12, free: { mesos: 5200 }, premium: { boostOfferId: "xp_tonic" } },
  { tier: 4, requiredProgress: 16, free: { fame: 12 }, premium: { crystals: 10 } },
  { tier: 5, requiredProgress: 20, free: { crystals: 6 }, premium: { relics: 1 } },
  { tier: 6, requiredProgress: 25, free: { mesos: 9500 }, premium: { boostOfferId: "gold_rush" } },
  { tier: 7, requiredProgress: 30, free: { crystals: 8 }, premium: { mesos: 12500 } },
  { tier: 8, requiredProgress: 36, free: { fame: 20 }, premium: { boostOfferId: "swift_sigil" } },
  { tier: 9, requiredProgress: 42, free: { crystals: 10 }, premium: { relics: 2 } },
  { tier: 10, requiredProgress: 50, free: { mesos: 22000, crystals: 12 }, premium: { boostOfferId: "loot_lens", relics: 3 } }
];

const DEFAULT_REWARDED_AD_STATE: RewardedAdState = {
  lastClaimedAt: {}
};

export const DEFAULT_SHOP_STATE: ShopState = {
  dailyDeals: [],
  activeBoosts: [],
  rewardedAds: DEFAULT_REWARDED_AD_STATE,
  seasonPass: {
    premiumUnlocked: false,
    progress: 0,
    weekKey: "",
    claimedFreeTiers: [],
    claimedPremiumTiers: []
  },
  lastDailyKey: ""
};

const DAILY_DEAL_ROTATION: MonetizationOfferId[] = [
  "gold_cache",
  "xp_tonic",
  "gold_rush",
  "swift_sigil",
  "loot_lens",
  "gold_vault"
];

function createDayKey(now = Date.now()): string {
  const date = new Date(now);
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}

function createWeekKey(now = Date.now()): string {
  const date = new Date(now);
  const first = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const day = Math.floor((date.getTime() - first.getTime()) / 86400000);
  const week = Math.floor((day + first.getUTCDay()) / 7);
  return `${date.getUTCFullYear()}-w${week}`;
}

function clampRemaining(seconds: number): number {
  return Math.max(0, Math.floor(seconds));
}

function buildDailyDeals(now = Date.now()): DailyDeal[] {
  const dayKey = createDayKey(now);
  const daySeed = Math.abs(
    dayKey.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  );
  const expiresAt = new Date(now);
  expiresAt.setUTCHours(23, 59, 59, 999);

  return Array.from({ length: 3 }, (_, index) => {
    const offerId = DAILY_DEAL_ROTATION[(daySeed + index) % DAILY_DEAL_ROTATION.length] ?? "gold_cache";
    const offer = SHOP_OFFERS[offerId];
    const discountPct = 15 + index * 5;
    return {
      slotId: `${dayKey}-${index}`,
      offerId,
      discountPct,
      expiresAt: expiresAt.getTime(),
      priceCrystals: Math.max(1, Math.floor(offer.costCrystals * (1 - discountPct / 100)))
    };
  });
}

function randomToken(length = 6): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += alphabet[Math.floor(defaultRng() * alphabet.length)] ?? "0";
  }
  return token;
}

function createBoostInstance(
  offer: ShopOfferDef,
  source: ActiveMonetizationBoost["source"]
): ActiveMonetizationBoost {
  return {
    id: `${offer.id}-${Date.now()}-${randomToken(5)}`,
    offerId: offer.id,
    type: offer.boostType ?? "xp",
    label: offer.title,
    icon: offer.icon,
    multiplier: offer.multiplier ?? 1,
    remainingSeconds: offer.durationSeconds ?? 0,
    source
  };
}

function mergeBoosts(
  activeBoosts: ActiveMonetizationBoost[],
  nextBoost: ActiveMonetizationBoost
): ActiveMonetizationBoost[] {
  const existingIndex = activeBoosts.findIndex((boost) => boost.offerId === nextBoost.offerId);
  if (existingIndex === -1) return [...activeBoosts, nextBoost];

  return activeBoosts.map((boost, index) => {
    if (index !== existingIndex) return boost;
    return {
      ...boost,
      remainingSeconds: Math.max(boost.remainingSeconds, nextBoost.remainingSeconds),
      multiplier: Math.max(boost.multiplier, nextBoost.multiplier)
    };
  });
}

function calculateBundleMesos(state: IdleGameState, factor: number): number {
  return Math.floor((2200 + state.level * 420 + state.stage * 180 + Math.sqrt(Math.max(0, state.totalGoldEarned))) * factor);
}

function getDailyDealPrice(shopState: ShopState, offerId: MonetizationOfferId): number | null {
  const deal = shopState.dailyDeals.find((entry) => entry.offerId === offerId);
  return deal ? deal.priceCrystals : null;
}

function applySeasonPassReward(
  state: IdleGameState,
  reward: SeasonPassTierReward,
  now = Date.now()
): IdleGameState {
  let nextState = {
    ...state,
    mesos: state.mesos + (reward.mesos ?? 0),
    crystals: state.crystals + (reward.crystals ?? 0),
    relics: state.relics + (reward.relics ?? 0),
    fame: state.fame + (reward.fame ?? 0)
  };

  if (reward.boostOfferId) {
    const offer = SHOP_OFFERS[reward.boostOfferId];
    if (offer?.kind === "boost") {
      nextState = {
        ...nextState,
        shop: {
          ...nextState.shop,
          activeBoosts: mergeBoosts(
            nextState.shop.activeBoosts,
            createBoostInstance(offer, "season_pass")
          )
        }
      };
    }
  }

  return syncMonetizationState(nextState, now);
}

export function getPremiumTrackProgress(state: Pick<IdleGameState, "level" | "stage" | "prestigeCount" | "lifetimeKills" | "lifetimeBossKills">): number {
  return Math.max(
    0,
    Math.floor(
      state.lifetimeBossKills * 3 +
      state.lifetimeKills / 20 +
      state.level / 2 +
      state.stage / 3 +
      state.prestigeCount * 4
    )
  );
}

export function syncShopState(shopState: ShopState | null | undefined, now = Date.now()): ShopState {
  const base = shopState ?? DEFAULT_SHOP_STATE;
  const dayKey = createDayKey(now);
  const weekKey = createWeekKey(now);
  const shouldRefreshDeals = !base.lastDailyKey || base.lastDailyKey !== dayKey || !base.dailyDeals.length;

  return {
    dailyDeals: shouldRefreshDeals ? buildDailyDeals(now) : base.dailyDeals.filter((deal) => deal.expiresAt > now),
    activeBoosts: (base.activeBoosts ?? []).filter((boost) => boost.remainingSeconds > 0),
    rewardedAds: {
      lastClaimedAt: { ...(base.rewardedAds?.lastClaimedAt ?? {}) }
    },
    seasonPass: {
      premiumUnlocked: Boolean(base.seasonPass?.premiumUnlocked),
      progress: Math.max(0, base.seasonPass?.progress ?? 0),
      weekKey,
      claimedFreeTiers: base.seasonPass?.weekKey === weekKey ? [...(base.seasonPass?.claimedFreeTiers ?? [])] : [],
      claimedPremiumTiers: base.seasonPass?.weekKey === weekKey ? [...(base.seasonPass?.claimedPremiumTiers ?? [])] : []
    },
    lastDailyKey: dayKey
  };
}

export function tickShopState(shopState: ShopState, elapsedSeconds: number): ShopState {
  if (elapsedSeconds <= 0) return shopState;
  return {
    ...shopState,
    activeBoosts: shopState.activeBoosts
      .map((boost) => ({ ...boost, remainingSeconds: clampRemaining(boost.remainingSeconds - elapsedSeconds) }))
      .filter((boost) => boost.remainingSeconds > 0)
  };
}

export function syncMonetizationState(state: IdleGameState, now = Date.now()): IdleGameState {
  const syncedShop = syncShopState(state.shop, now);
  return {
    ...state,
    shop: {
      ...syncedShop,
      seasonPass: {
        ...syncedShop.seasonPass,
        progress: getPremiumTrackProgress(state)
      }
    }
  };
}

export function getShopBoostMultipliers(shopState: ShopState): ShopBoostMultipliers {
  return shopState.activeBoosts.reduce<ShopBoostMultipliers>((acc, boost) => {
    if (boost.type === "xp") acc.xpMult *= boost.multiplier;
    if (boost.type === "gold") acc.goldMult *= boost.multiplier;
    if (boost.type === "attack_speed") acc.attackSpeedMult *= boost.multiplier;
    if (boost.type === "loot") {
      acc.lootDropMult *= boost.multiplier;
      acc.lootRarityBonus += 4;
    }
    return acc;
  }, {
    xpMult: 1,
    goldMult: 1,
    attackSpeedMult: 1,
    lootDropMult: 1,
    lootRarityBonus: 0
  });
}

export function getAdCooldownRemaining(shopState: ShopState, placement: RewardedAdPlacement, now = Date.now()): number {
  const lastClaimedAt = shopState.rewardedAds.lastClaimedAt[placement] ?? 0;
  const cooldownMs = REWARDED_AD_COOLDOWNS[placement] * 1000;
  return Math.max(0, Math.ceil((lastClaimedAt + cooldownMs - now) / 1000));
}

export function getClaimableSeasonPassTiers(shopState: ShopState, track: SeasonPassTrack): number[] {
  const claimed = track === "premium" ? shopState.seasonPass.claimedPremiumTiers : shopState.seasonPass.claimedFreeTiers;
  if (track === "premium" && !shopState.seasonPass.premiumUnlocked) return [];

  return SEASON_PASS_TIERS
    .filter((tier) => shopState.seasonPass.progress >= tier.requiredProgress && !claimed.includes(tier.tier))
    .map((tier) => tier.tier);
}

export function purchaseShopOffer(
  state: IdleGameState,
  offerId: MonetizationOfferId,
  now = Date.now()
): { state: IdleGameState; message: string; success: boolean } {
  const syncedState = syncMonetizationState(state, now);
  const offer = SHOP_OFFERS[offerId];
  if (!offer) return { state: syncedState, message: "Offer not found.", success: false };

  if (offer.oneTime && offer.id === "premium_track" && syncedState.shop.seasonPass.premiumUnlocked) {
    return { state: syncedState, message: "Premium track already unlocked.", success: false };
  }

  const price = getDailyDealPrice(syncedState.shop, offerId) ?? offer.costCrystals;
  if (syncedState.crystals < price) {
    return {
      state: syncedState,
      message: `Need ${price} ${PREMIUM_CURRENCY_LABEL.toLowerCase()} for ${offer.title}.`,
      success: false
    };
  }

  let nextState: IdleGameState = {
    ...syncedState,
    crystals: syncedState.crystals - price
  };

  if (offer.kind === "bundle") {
    const mesos = offer.id === "gold_vault"
      ? calculateBundleMesos(syncedState, 2.4)
      : calculateBundleMesos(syncedState, 1.2);
    nextState = { ...nextState, mesos: nextState.mesos + mesos };
    return {
      state: syncMonetizationState(nextState, now),
      message: `${offer.title} opened: +${Math.floor(mesos)} mesos.`,
      success: true
    };
  }

  if (offer.kind === "boost") {
    nextState = {
      ...nextState,
      shop: {
        ...nextState.shop,
        activeBoosts: mergeBoosts(nextState.shop.activeBoosts, createBoostInstance(offer, "shop"))
      }
    };
    return {
      state: syncMonetizationState(nextState, now),
      message: `${offer.title} activated for ${Math.floor((offer.durationSeconds ?? 0) / 60)} min.`,
      success: true
    };
  }

  if (offer.id === "premium_track") {
    nextState = {
      ...nextState,
      shop: {
        ...nextState.shop,
        seasonPass: {
          ...nextState.shop.seasonPass,
          premiumUnlocked: true
        }
      }
    };
    return {
      state: syncMonetizationState(nextState, now),
      message: "Premium battle pass track unlocked.",
      success: true
    };
  }

  return { state: syncedState, message: "Offer could not be applied.", success: false };
}

export function claimRewardedAd(
  state: IdleGameState,
  placement: RewardedAdPlacement,
  now = Date.now()
): { state: IdleGameState; message: string; success: boolean } {
  const syncedState = syncMonetizationState(state, now);
  const cooldownRemaining = getAdCooldownRemaining(syncedState.shop, placement, now);
  if (cooldownRemaining > 0) {
    return {
      state: syncedState,
      message: `Rewarded ad ready in ${cooldownRemaining}s.`,
      success: false
    };
  }

  let nextState: IdleGameState = syncedState;
  let message = "Reward claimed.";

  if (placement === "double_rewards") {
    const mesosReward = calculateBundleMesos(syncedState, 0.8);
    const crystalReward = 3 + Math.floor(syncedState.level / 12);
    nextState = {
      ...syncedState,
      mesos: syncedState.mesos + mesosReward,
      crystals: syncedState.crystals + crystalReward
    };
    message = `Rewarded ad bonus: +${Math.floor(mesosReward)} mesos, +${crystalReward} crystals.`;
  }

  if (placement === "free_chest") {
    const mesosReward = calculateBundleMesos(syncedState, 0.55);
    nextState = {
      ...syncedState,
      mesos: syncedState.mesos + mesosReward,
      relics: syncedState.relics + (syncedState.level >= 25 ? 1 : 0)
    };
    message = `Free chest opened: +${Math.floor(mesosReward)} mesos${syncedState.level >= 25 ? ", +1 relic" : ""}.`;
  }

  if (placement === "boost_trial") {
    const offer = SHOP_OFFERS.xp_tonic;
    nextState = {
      ...syncedState,
      shop: {
        ...syncedState.shop,
        activeBoosts: mergeBoosts(syncedState.shop.activeBoosts, {
          ...createBoostInstance(offer, "ad"),
          remainingSeconds: 60 * 10
        })
      }
    };
    message = "XP Tonic trial activated for 10 min.";
  }

  nextState = {
    ...nextState,
    shop: {
      ...nextState.shop,
      rewardedAds: {
        ...nextState.shop.rewardedAds,
        lastClaimedAt: {
          ...nextState.shop.rewardedAds.lastClaimedAt,
          [placement]: now
        }
      }
    }
  };

  return {
    state: syncMonetizationState(nextState, now),
    message,
    success: true
  };
}

export function claimSeasonPassReward(
  state: IdleGameState,
  tierNumber: number,
  track: SeasonPassTrack,
  now = Date.now()
): { state: IdleGameState; message: string; success: boolean } {
  const syncedState = syncMonetizationState(state, now);
  const tier = SEASON_PASS_TIERS.find((entry) => entry.tier === tierNumber);
  if (!tier) return { state: syncedState, message: "Season tier not found.", success: false };
  if (syncedState.shop.seasonPass.progress < tier.requiredProgress) {
    return { state: syncedState, message: "Tier not unlocked yet.", success: false };
  }

  if (track === "premium" && !syncedState.shop.seasonPass.premiumUnlocked) {
    return { state: syncedState, message: "Premium track locked.", success: false };
  }

  const claimedKey = track === "premium" ? "claimedPremiumTiers" : "claimedFreeTiers";
  if (syncedState.shop.seasonPass[claimedKey].includes(tierNumber)) {
    return { state: syncedState, message: "Reward already claimed.", success: false };
  }

  const claimedState: IdleGameState = {
    ...syncedState,
    shop: {
      ...syncedState.shop,
      seasonPass: {
        ...syncedState.shop.seasonPass,
        [claimedKey]: [...syncedState.shop.seasonPass[claimedKey], tierNumber]
      }
    }
  };

  const reward = track === "premium" ? tier.premium : tier.free;
  return {
    state: applySeasonPassReward(claimedState, reward, now),
    message: `${track === "premium" ? "Premium" : "Free"} pass tier ${tierNumber} claimed.`,
    success: true
  };
}
