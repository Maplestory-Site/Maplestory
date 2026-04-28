import "./IdleStoryWorld.css";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameShell } from "./shared/GameShell";
import { updateGameMeta } from "./shared/gameMeta";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { useMockAuth } from "../../../features/profile/MockAuthContext";
import {
  activateClassSkill,
  autoEquipBestLoot,
  buildFreshState,
  buyBestGear,
  buyBestHero,
  buyBestUpgrade,
  buyGear,
  buyGlobalMult,
  buyHero,
  buyShopOffer,
  buyTalent,
  buyUpgrade,
  changeZone,
  claimComebackReward,
  claimDailyReward,
  claimMicroMissionReward,
  claimSeasonPassTier,
  claimWeeklyPveReward,
  craftLootRecipe,
  enhanceLootItem,
  equipLootItem,
  formatNumber,
  getRetentionSummary,
  huntBurst,
  getLocalSaveStatus,
  loadGameState,
  markNotificationsRead,
  prestigeWorld,
  raidBoss,
  rebirthWorld,
  rerollLootItem,
  resolveShadowBattle,
  salvageLootItem,
  exportSave,
  importSave,
  saveGameState,
  selectClass,
  setBuildFocus,
  setSkillBranchChoice,
  startDungeon,
  syncGuildState,
  syncMonetizationState,
  trainBestSkill,
  trainSkill,
  unequipLootItem,
  upgradeRelic,
  watchRewardedAd,
  type ClassId,
  type ClassSkillId,
  type CraftRecipeId,
  type DatabaseMonster,
  type GlobalMultId,
  type IdleGameState,
  type IdleItemType,
  type LocalSaveStatus,
  type RerollMode,
  type RelicUpgradeId,
  type ShadowSnapshot,
  type TalentNodeId,
  type WorldZone
} from "./idlestory/gameEngine";
import {
  calculateDPS,
  computeScore,
  GEAR,
  getCurrentMonster,
  getFeaturedLoot,
  getGearCost,
  getHeroCost,
  getMesosPerSecond,
  getSkillCost,
  getUpgradeCost,
  getXpTarget,
  HEROES,
  SKILLS,
  UPGRADES
} from "./idlestory/progressionSystem";
import {
  getEnemyAttackIntervalMs,
  getEnemyAttackPerSecond,
  getEnemyHpPercent,
  isBossStage
} from "./idlestory/combatSystem";
import {
  DUNGEON_DEFINITIONS,
  getDungeonDisplayMonster,
  type DungeonType
} from "./idlestory/dungeonSystem";
import {
  getProgressionHint,
  getProgressionMultiplier,
  getPowerStatus,
  getZonePowerRequirement,
  isEliteStage
} from "./idlestory/progressionGates";
import { CLASSES, getClassMaxHp } from "./idlestory/classSystem";
import { getAllClassSkills, getActiveRegenMult } from "./idlestory/skillSystem";
import { type BuildFocusId, type SkillBranchId } from "./idlestory/skillBuildSystem";
import { getIncomeRates } from "./idlestory/economySystem";
import {
  getAdCooldownRemaining,
  getClaimableSeasonPassTiers,
  type MonetizationOfferId,
  type RewardedAdPlacement,
  type SeasonPassTrack
} from "./idlestory/shopSystem";
import { getRebirthPreview } from "./idlestory/rebirthSystem";
import {
  ALL_ZONES,
  getFullZoneOrFirst,
  getStageEnemy,
  getZoneBossEffect,
  getZoneProgressSummary
} from "./idlestory/zoneSystem";
import { getThemeVisualIdentity, getZoneBackground } from "./idlestory/mapBackgrounds";
import { defaultRng } from "./idlestory/seededRng";
import {
  contributeIdleGuildRaid,
  createIdleGuild,
  joinIdleGuild,
  leaveIdleGuild,
  submitIdleShadowBattle
} from "./idlestory/onlineIdleService";
import {
  ClassPickTab,
  ClassTab,
  CombatTab,
  EconomyTab,
  ShopTab,
  ZoneTab
} from "./idlestory/ui/WorldTabsPanels";
import { getBossDefinition } from "./idlestory/bossSystem";
import {
  calculatePowerRating,
  formatPowerRating,
  getNextMilestone,
  getPowerTier
} from "./idlestory/powerSpikeSystem";
import { useBossFlow } from "./idlestory/hooks/useBossFlow";
import { useCombatFeedbackUI } from "./idlestory/hooks/useCombatFeedbackUI";
import { useCombatTimingLoops } from "./idlestory/hooks/useCombatTimingLoops";
import { useIdleStoryDataLoader } from "./idlestory/hooks/useIdleStoryDataLoader";
import { useSocialCloudSync } from "./idlestory/hooks/useSocialCloudSync";
import { useTutorialPowerSpikeFlow } from "./idlestory/hooks/useTutorialPowerSpikeFlow";
import type { TabId } from "./idlestory/worldTypes";
import { sanitizeGameText, sanitizeMonsterPortrait } from "./idlestory/textSanitizer";
import { IdleStoryStartScreen } from "./idlestory/ui/IdleStoryStartScreen";
import {
  resolveStartAction,
  type StartAction,
  type StartScreenMode
} from "./idlestory/startScreenFlow";

function getSafeMonsterPortrait(portrait: string | null | undefined, fallback: string) {
  return sanitizeMonsterPortrait(portrait, fallback);
}

function isRenderableImageSource(source: string | null | undefined) {
  const value = (source ?? "").trim();
  if (!value) return false;
  if (value.startsWith("data:image/")) return true;
  if (/^https?:\/\/\S+$/i.test(value)) return true;
  if (/^\/[^?#]+\.(png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i.test(value)) return true;
  return false;
}

const BossPanel = lazy(() => import("./idlestory/ui/BossPanel").then((module) => ({ default: module.BossPanel })));
const HeroesPanel = lazy(() => import("./idlestory/ui/HeroesPanel").then((module) => ({ default: module.HeroesPanel })));
const InventoryPanel = lazy(() => import("./idlestory/ui/InventoryPanel").then((module) => ({ default: module.InventoryPanel })));
const SocialPanel = lazy(() => import("./idlestory/ui/SocialPanel").then((module) => ({ default: module.SocialPanel })));
const TalentTreePanel = lazy(() => import("./idlestory/ui/TalentTreePanel").then((module) => ({ default: module.TalentTreePanel })));

export function IdleStoryWorldGame() {
  const { user, openAuth } = useMockAuth();
  const [saveStatus, setSaveStatus] = useState<LocalSaveStatus>(() => getLocalSaveStatus());
  const [startScreenMode, setStartScreenMode] = useState<StartScreenMode>("menu");
  const [selectedStartAction, setSelectedStartAction] = useState<StartAction | null>(null);
  const [initialGameState, setInitialGameState] = useState<IdleGameState | null>(null);

  const hasValidLocalSave = saveStatus.hasValidSave;

  const startWithFreshState = () => {
    const freshState = buildFreshState();
    saveGameState(freshState);
    setSaveStatus(getLocalSaveStatus());
    setInitialGameState(freshState);
  };

  const handleStartAction = (action: StartAction) => {
    setSelectedStartAction(action);
    const resolution = resolveStartAction(action, hasValidLocalSave);
    setStartScreenMode(resolution.mode);

    if (resolution.shouldLoadSave) {
      setInitialGameState(loadGameState());
      return;
    }

    if (resolution.shouldCreateNewState) {
      startWithFreshState();
      return;
    }

    if (resolution.shouldOpenAuth) {
      openAuth();
    }
  };

  const handleConfirmNewGame = () => {
    setSelectedStartAction("new");
    setStartScreenMode("menu");
    startWithFreshState();
  };

  const handleCancelStartModal = () => {
    setStartScreenMode("menu");
    setSelectedStartAction(null);
    setSaveStatus(getLocalSaveStatus());
  };

  if (!initialGameState) {
    return (
      <GameShell title="IdleStory World" subtitle="Choose your adventure" icon="IW" aspectRatio="16 / 9">
        <IdleStoryStartScreen
          saveStatus={saveStatus}
          startScreenMode={startScreenMode}
          selectedStartAction={selectedStartAction}
          isSignedIn={Boolean(user)}
          onContinue={() => handleStartAction("continue")}
          onStartNew={() => handleStartAction("new")}
          onConfirmNewGame={handleConfirmNewGame}
          onCancelModal={handleCancelStartModal}
          onRegister={() => handleStartAction("register")}
        />
      </GameShell>
    );
  }

  return <IdleStoryWorldGameContent initialState={initialGameState} />;
}

function IdleStoryWorldGameContent({ initialState }: { initialState: IdleGameState }) {
  const { playFailure, playSuccess, playHit, playCrit, playLevelUp, playReward } = useMiniGamesSound();
  const { user, openAuth } = useMockAuth();

  // Database + core state
  const [toast, setToast] = useState("Loading Maple World...");
  const [state, setState] = useState<IdleGameState>(() => initialState);
  const [tab, setTab] = useState<TabId>("combat");
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [enemyImageBroken, setEnemyImageBroken] = useState(false);
  const prevEventIdsRef = useRef<string[]>([]);
  const isMountedRef = useRef(true);
  const createGuildRequestRef = useRef(0);
  const joinGuildRequestRef = useRef(0);
  const leaveGuildRequestRef = useRef(0);
  const raidGuildRequestRef = useRef(0);
  const shadowSubmitRequestRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Derived world context
  const zone = useMemo(() => getFullZoneOrFirst(state.zone), [state.zone]);
  const mapBg = useMemo(() => getZoneBackground(zone.id), [zone.id]);
  const visualIdentity = useMemo(() => getThemeVisualIdentity(zone.theme), [zone.theme]);

  const { maps, monsters, items } = useIdleStoryDataLoader({
    currentZoneName: zone.name,
    setToast,
    setState
  });

  const activeDungeonRun = state.dungeonState.activeRun;
  const worldMonster = useMemo(() => getCurrentMonster(state, zone, monsters), [state, zone, monsters]);
  const currentMonster = useMemo(
    () => (activeDungeonRun ? getDungeonDisplayMonster(zone, activeDungeonRun) : worldMonster),
    [activeDungeonRun, worldMonster, zone]
  );
  const featuredLoot = useMemo(() => getFeaturedLoot(currentMonster, items), [currentMonster, items]);
  const dps = useMemo(() => calculateDPS(state), [state]);
  const mesosPerSecond = useMemo(
    () => getMesosPerSecond(state, zone, currentMonster, featuredLoot.length),
    [state, zone, currentMonster, featuredLoot.length]
  );
  const xpTarget = getXpTarget(state.level);
  const xpProgress = Math.min(100, (state.xp / xpTarget) * 100);
  const playerMaxHp = state.classId ? getClassMaxHp(state.classId, state.level) : 120 + state.level * 18;

  const displayEnemyHp = activeDungeonRun?.enemyHp ?? state.enemyHp;
  const displayEnemyMaxHp = activeDungeonRun?.enemyMaxHp ?? state.enemyMaxHp;
  const enemyHpPct =
    displayEnemyMaxHp > 0
      ? Math.max(0, Math.min(100, (displayEnemyHp / displayEnemyMaxHp) * 100))
      : getEnemyHpPercent(state);
  const isBoss = activeDungeonRun ? activeDungeonRun.isBossWave : isBossStage(state.stage);
  const zoneBossEffect = useMemo(() => (isBoss ? getZoneBossEffect(zone) : null), [isBoss, zone]);
  const zoneProgress = useMemo(() => getZoneProgressSummary(state, state.zone), [state]);
  const stageEnemy = useMemo(
    () => (activeDungeonRun ? getDungeonDisplayMonster(zone, activeDungeonRun) : getStageEnemy(zone, state.stage)),
    [activeDungeonRun, zone, state.stage]
  );

  const incomeRates = useMemo(() => getIncomeRates(state, mesosPerSecond), [state, mesosPerSecond]);
  const rebirthPreview = useMemo(() => getRebirthPreview(state), [state]);
  const activeClass = state.classId ? CLASSES[state.classId] : null;
  const maxResource = activeClass?.maxResource ?? 0;
  const resourcePct = maxResource > 0 ? Math.min(100, (state.resource / maxResource) * 100) : 0;
  const classSkills = useMemo(() => (state.classId ? getAllClassSkills(state.classId) : []), [state.classId]);
  const score = useMemo(() => computeScore(state, dps, maps.length, monsters.length, items.length), [state, dps, maps.length, monsters.length, items.length]);
  const retentionSummary = useMemo(() => getRetentionSummary(state), [state]);
  const bossDefinition = useMemo(() => (isBoss ? getBossDefinition(state.zone) : null), [isBoss, state.zone]);

  const activeShopBoosts = state.shop.activeBoosts;
  const claimableFreePassTiers = useMemo(() => getClaimableSeasonPassTiers(state.shop, "free"), [state.shop]);
  const claimablePremiumPassTiers = useMemo(() => getClaimableSeasonPassTiers(state.shop, "premium"), [state.shop]);
  const shopAttention = claimableFreePassTiers.length > 0 || claimablePremiumPassTiers.length > 0;
  const rewardedAdCooldowns = useMemo(
    () => ({
      double_rewards: getAdCooldownRemaining(state.shop, "double_rewards"),
      free_chest: getAdCooldownRemaining(state.shop, "free_chest"),
      boost_trial: getAdCooldownRemaining(state.shop, "boost_trial")
    }),
    [state.shop]
  );

  const socialIdentity = useMemo(() => {
    if (user) {
      return { id: user.id, username: user.username };
    }
    if (typeof window === "undefined") {
      return { id: "guest-idlestory", username: "Guest Hero" };
    }
    const storageKey = "idlestory-world:social-guest";
    let guestId = window.localStorage.getItem(storageKey);
    if (!guestId) {
      guestId = `guest-${Math.floor(defaultRng() * 36 ** 8).toString(36).padStart(8, "0")}`;
      window.localStorage.setItem(storageKey, guestId);
    }
    return { id: guestId, username: "Guest Hero" };
  }, [user]);

  const {
    guildName,
    setGuildName,
    socialGuilds,
    setSocialGuilds,
    currentGuild,
    setCurrentGuild,
    leaderboards,
    leaderboardCategory,
    setLeaderboardCategory,
    weeklyRanking,
    weeklyRank,
    shadowOpponents,
    socialStatus,
    setSocialStatus
  } = useSocialCloudSync({
    user,
    socialIdentity,
    state,
    score,
    setState
  });

  const canClaimWeeklyRewardNow = useMemo(() => {
    const rankingState = state.weeklyRankingState;
    if (!rankingState?.lastResolvedRank) return false;
    return !rankingState.claimedWeeks.includes(rankingState.weekKey);
  }, [state.weeklyRankingState]);

  const powerRating = useMemo(
    () => calculatePowerRating(dps, state.level, state.prestigeCount),
    [dps, state.level, state.prestigeCount]
  );
  const powerTier = useMemo(() => getPowerTier(powerRating), [powerRating]);
  const nextMilestone = useMemo(() => getNextMilestone(state.level), [state.level]);
  const surgeActive = state.bossSurgeSecondsLeft > 0;

  const isElite = activeDungeonRun
    ? activeDungeonRun.wave === activeDungeonRun.totalWaves - 1 && !activeDungeonRun.isBossWave
    : isEliteStage(state.stage);
  const enemyEncounterType: "normal" | "elite" | "boss" = isBoss ? "boss" : isElite ? "elite" : "normal";
  const enemyAttackPerSecond = useMemo(
    () => getEnemyAttackPerSecond(state.stage, zone, enemyEncounterType),
    [state.stage, zone, enemyEncounterType]
  );
  const enemyAttackIntervalMs = useMemo(
    () => getEnemyAttackIntervalMs(state.stage, zone, enemyEncounterType),
    [state.stage, zone, enemyEncounterType]
  );

  const {
    bossPhase,
    activeMechanicId,
    mechanicTimeLeft,
    enrageTimeLeft,
    isBossEnraged,
    bossVoiceLine,
    bossIntro,
    bossDpsMultiplierRef
  } = useBossFlow({
    isBoss,
    bossDefinition,
    state
  });

  const {
    dmgNums,
    feelBursts,
    rewardText,
    isHit,
    isKillFlash,
    isStageClear,
    isGoldBumping,
    isXpLevelup,
    goldPops,
    combatFeed,
    isBossHitShake,
    isLevelUpFlash,
    spawnDmg,
    pushCombatFeed
  } = useCombatFeedbackUI({
    state,
    isBoss,
    dps,
    playCrit,
    playHit,
    playReward,
    playLevelUp,
    playSuccess,
    setToast
  });

  const { playerHpDisplay, enemyAttackProgress, enemyHitPulse } = useCombatTimingLoops({
    stage: state.stage,
    playerMaxHp,
    enemyAttackIntervalMs,
    enemyAttackPerSecond,
    spawnDmg,
    pushCombatFeed,
    setState,
    monsters,
    items,
    bossDpsMultiplierRef
  });

  const playerHpPct = Math.max(0, Math.min(100, (playerHpDisplay / Math.max(1, playerMaxHp)) * 100));

  const {
    tutorialStep,
    tutorialHint,
    wowMoment,
    lootDropVisible,
    powerSpike,
    advanceOnTabOpen,
    advanceOnUpgrade
  } = useTutorialPowerSpikeFlow({
    state,
    powerRating,
    playLevelUp,
    setState
  });

  const zonePowerReq = useMemo(() => getZonePowerRequirement(zone), [zone]);
  const progMult = useMemo(() => getProgressionMultiplier(dps, zonePowerReq), [dps, zonePowerReq]);
  const powerStatus = useMemo(() => getPowerStatus(dps, zonePowerReq), [dps, zonePowerReq]);
  const progressionHint = useMemo(() => getProgressionHint(dps, zonePowerReq), [dps, zonePowerReq]);
  const momentumTier = Math.min(5, Math.floor(state.killStreak / 12));
  const nextStreakMilestone = Math.min(60, (momentumTier + 1) * 12);
  const streakToNext = Math.max(0, nextStreakMilestone - state.killStreak);
  const objectivePct = Math.max(0, Math.min(100, (state.activeObjective.progress / Math.max(1, state.activeObjective.target)) * 100));
  const nextZoneLabel = zoneProgress.nextLocked?.name ?? "All current maps unlocked";
  const nextZoneHint = zoneProgress.nextLocked
    ? zoneProgress.levelsToNext > 0
      ? `Lv.${zoneProgress.nextLocked.requirement} unlock`
      : zoneProgress.prestigesToNext > 0
        ? `Need Prestige x${zoneProgress.nextLocked.prestigeRequired}`
        : "Ready to unlock"
    : "Push stage for better rewards";

  useEffect(() => {
    const prevIds = prevEventIdsRef.current;
    const activeEvents = state.activeEvents ?? [];
    const newEvent = activeEvents.find((event) => !prevIds.includes(event.id));
    if (newEvent) {
      const safeEventIcon = sanitizeMonsterPortrait(newEvent.icon, "!");
      const safeEventLabel = sanitizeGameText(newEvent.label, "World Event");
      const safeEventDescription = sanitizeGameText(newEvent.description, "");
      setToast(
        `${safeEventIcon} ${safeEventLabel}${safeEventDescription ? ` - ${safeEventDescription}` : ""}`
      );
      playReward();
    }
    prevEventIdsRef.current = activeEvents.map((event) => event.id);
  }, [state.activeEvents, playReward]);
  // ── Dispatcher ────────────────────────────────────────────────────────────
  function dispatch(result: { state: IdleGameState; message: string; success: boolean }) {
    const synced = syncMonetizationState(result.state);
    const stamped = { ...synced, lastSavedAt: Date.now() };
    setState(stamped);
    const saveResult = saveGameState(stamped);
    // Surface quota errors without blocking the action's own feedback.
    if (!saveResult.ok) {
      setToast(`⚠ Save failed: ${saveResult.error ?? "storage full"}`);
    } else {
      setToast(result.message);
    }
    if (result.success) {
      playSuccess();
      advanceOnUpgrade();
    } else {
      playFailure();
    }
  }

  // ── Tutorial-aware tab setter ─────────────────────────────────────────────
  function handleTabChange(newTab: TabId) {
    setTab(newTab);
    advanceOnTabOpen(newTab);
  }

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleHunt = () => dispatch(huntBurst(state, { zone, monster: currentMonster, lootCount: featuredLoot.length }));

  const handleBuyHero = (id: keyof typeof HEROES) => dispatch(buyHero(state, id, HEROES[id].name, getHeroCost(id, state.heroLevels[id])));
  const handleBuyUpgrade = (id: keyof typeof UPGRADES) => dispatch(buyUpgrade(state, id, UPGRADES[id].name, getUpgradeCost(id, state.upgrades[id])));
  const handleBuyGear = (id: keyof typeof GEAR) => dispatch(buyGear(state, id, GEAR[id].name, getGearCost(id, state.gearLevels[id])));
  const handleEquipLoot = (itemId: string) => dispatch(equipLootItem(state, itemId));
  const handleUnequipLoot = (type: IdleItemType) => dispatch(unequipLootItem(state, type));
  const handleAutoEquipLoot = () => dispatch(autoEquipBestLoot(state));
  const handleEnhanceLoot = (itemId: string) => dispatch(enhanceLootItem(state, itemId));
  const handleRerollLoot = (itemId: string, mode: RerollMode) => dispatch(rerollLootItem(state, itemId, mode));
  const handleSalvageLoot = (itemId: string) => dispatch(salvageLootItem(state, itemId));
  const handleCraftLoot = (recipeId: CraftRecipeId) => dispatch(craftLootRecipe(state, recipeId, zone.requirement));
  const handleTrainSkill = (id: keyof typeof SKILLS) => dispatch(trainSkill(state, id, SKILLS[id].name, getSkillCost(id, state.skillLevels[id])));
  const handleBuyGlobalMult = (id: GlobalMultId) => dispatch(buyGlobalMult(state, id));
  const handleUpgradeRelic = (id: RelicUpgradeId) => dispatch(upgradeRelic(state, id));
  const handleBuyTalent    = (id: TalentNodeId) => dispatch(buyTalent(state, id));
  const handleSelectClass = (id: ClassId) => dispatch(selectClass(state, id));
  const handleActivateSkill = (id: ClassSkillId) => dispatch(activateClassSkill(state, id, dps));
  const handleSetBuildFocus = (id: BuildFocusId) => dispatch(setBuildFocus(state, id));
  const handleSetSkillBranch = (skillId: ClassSkillId, branchId: SkillBranchId) =>
    dispatch(setSkillBranchChoice(state, skillId, branchId));
  const handleChangeZone = (z: WorldZone) => dispatch(changeZone(state, z));
  const handleClaimDailyReward = () => dispatch(claimDailyReward(state));
  const handleClaimComebackReward = () => dispatch(claimComebackReward(state));
  const handleStartDungeon = (type: DungeonType) => dispatch(startDungeon(state, type, zone));
  const handleReadNotifications = () => dispatch(markNotificationsRead(state));
  const handleBuyShopOffer = (offerId: MonetizationOfferId) => dispatch(buyShopOffer(state, offerId));
  const handleWatchRewardedAd = (placement: RewardedAdPlacement) => dispatch(watchRewardedAd(state, placement));
  const handleClaimSeasonPassTier = (tier: number, track: SeasonPassTrack) => dispatch(claimSeasonPassTier(state, tier, track));
  const handleCreateGuild = () => {
    const requestId = ++createGuildRequestRef.current;
    void createIdleGuild(socialIdentity.id, socialIdentity.username, {
      name: guildName,
      icon: "Guild",
      power: powerRating,
      level: state.level
    }).then((guild) => {
      if (!guild || !isMountedRef.current || requestId !== createGuildRequestRef.current) return;
      setSocialGuilds((cur) => cur.some((entry) => entry.id === guild.id) ? cur : [guild, ...cur]);
      setCurrentGuild(guild);
      let nextState: IdleGameState | null = null;
      setState((cur) => {
        nextState = {
          ...cur,
          guildState: syncGuildState(cur.guildState, {
            guildId: guild.id,
            guildName: guild.name,
            guildIcon: guild.icon,
            guildXp: guild.xp,
            guildLevel: guild.level,
            memberCount: guild.members.length
          })
        };
        return nextState;
      });
      if (nextState) saveGameState(nextState);
      setSocialStatus(`Guild ${guild.name} ready`);
    });
  };
  const handleJoinGuild = (guildId: string) => {
    const requestId = ++joinGuildRequestRef.current;
    void joinIdleGuild(socialIdentity.id, socialIdentity.username, {
      guildId,
      power: powerRating,
      level: state.level
    }).then((guild) => {
      if (!guild || !isMountedRef.current || requestId !== joinGuildRequestRef.current) return;
      setSocialGuilds((cur) => cur.map((entry) => entry.id === guild.id ? guild : entry));
      setCurrentGuild(guild);
      let nextState: IdleGameState | null = null;
      setState((cur) => {
        nextState = {
          ...cur,
          guildState: syncGuildState(cur.guildState, {
            guildId: guild.id,
            guildName: guild.name,
            guildIcon: guild.icon,
            guildXp: guild.xp,
            guildLevel: guild.level,
            memberCount: guild.members.length
          })
        };
        return nextState;
      });
      if (nextState) saveGameState(nextState);
      setSocialStatus(`Joined ${guild.name}`);
    });
  };
  const handleLeaveGuild = () => {
    const requestId = ++leaveGuildRequestRef.current;
    void leaveIdleGuild(socialIdentity.id, socialIdentity.username).then((ok) => {
      if (!ok || !isMountedRef.current || requestId !== leaveGuildRequestRef.current) return;
      setCurrentGuild(null);
      let nextState: IdleGameState | null = null;
      setState((cur) => {
        nextState = { ...cur, guildState: syncGuildState(cur.guildState, null) };
        return nextState;
      });
      if (nextState) saveGameState(nextState);
      setSocialStatus("Guild left");
    });
  };
  const handleGuildRaidBoss = () => {
    if (!currentGuild) return;
    const raidDamage = Math.max(1200, Math.floor(dps * 8));
    const requestId = ++raidGuildRequestRef.current;
    void contributeIdleGuildRaid(socialIdentity.id, socialIdentity.username, {
      guildId: currentGuild.id,
      damage: raidDamage
    }).then((guild) => {
      if (!guild || !isMountedRef.current || requestId !== raidGuildRequestRef.current) return;
      setCurrentGuild(guild);
      setSocialGuilds((cur) => cur.map((entry) => entry.id === guild.id ? guild : entry));
      setSocialStatus(`Guild raid hit for ${formatNumber(raidDamage)}`);
    });
  };
  const handleClaimWeeklyReward = () => {
    dispatch(claimWeeklyPveReward(state));
  };
  const handleShadowBattle = (opponent: ShadowSnapshot) => {
    const battle = resolveShadowBattle(state, opponent, socialIdentity.username, socialIdentity.id);
    dispatch(battle);
    if (battle.success) {
      const requestId = ++shadowSubmitRequestRef.current;
      void submitIdleShadowBattle(socialIdentity.id, socialIdentity.username, {
        rating: battle.state.pvpState.rating,
        wins: battle.state.pvpState.wins,
        losses: battle.state.pvpState.losses
      }).then(() => {
        if (!isMountedRef.current || requestId !== shadowSubmitRequestRef.current) return;
      });
    }
  };

  const handleClaimMicroMission = (missionId: string) =>
    dispatch(claimMicroMissionReward(state, missionId));

  const handleExportSave = () => {
    const encoded = exportSave(state);
    try {
      navigator.clipboard.writeText(encoded);
      setToast("Save copied to clipboard!");
    } catch {
      // Clipboard not available — show the string in the import box so user can copy manually
      setImportText(encoded);
      setSaveMenuOpen(true);
      setToast("Clipboard unavailable — copy from the box below.");
    }
  };

  const handleImportSave = () => {
    const trimmed = importText.trim();
    if (!trimmed) return;
    const restored = importSave(trimmed);
    if (!restored) {
      setToast("Import failed: invalid save string.");
      return;
    }
    setState(restored);
    saveGameState(restored);
    setImportText("");
    setSaveMenuOpen(false);
    setToast("Save imported successfully!");
  };

  const handlePrestige = () => {
    const r = prestigeWorld(state, ALL_ZONES);
    if (r.success) updateGameMeta({ gameId: "idlestory-world", score, outcome: "session" });
    dispatch(r);
  };
  const handleRebirth = () => {
    const r = rebirthWorld(state, ALL_ZONES);
    if (r.success) updateGameMeta({ gameId: "idlestory-world", score, outcome: "session" });
    dispatch(r);
  };
  const handleRaidBoss = () => {
    const boss = monsters.find(m => m.isBoss) ?? currentMonster;
    dispatch(raidBoss(state, zone, boss?.name ?? "World Boss", calculateDPS));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const hpTier = enemyHpPct > 60 ? "hi" : enemyHpPct > 25 ? "mid" : "lo";
  const enemyName = sanitizeGameText(currentMonster?.name ?? stageEnemy?.name ?? "Monster", "Monster");
  const enemyImage = currentMonster?.image ?? stageEnemy?.image ?? null;
  const renderableEnemyImage = isRenderableImageSource(enemyImage) ? enemyImage : null;
  const safeEnemyPortrait = getSafeMonsterPortrait(
    currentMonster?.portrait ?? stageEnemy?.portrait,
    "\u{1F47E}"
  );
  const monsterIdentity = currentMonster as (DatabaseMonster & Partial<{
    elementalType: string;
    specialTrait: string;
    roleIdentity: string;
    title: string;
    variantLabel: string;
  }>) | null;
  const mapLocationName = sanitizeGameText(mapBg?.locationName ?? zone.name, zone.name);
  const arenaFxClass = [
    isBoss ? "is-boss-fx" : "",
    isElite ? "is-elite-fx" : "",
    isHit ? "is-hit-fx" : "",
    isKillFlash ? "is-kill-fx" : "",
    isStageClear ? "is-clear-fx" : "",
    lootDropVisible ? "is-loot-fx" : "",
    surgeActive ? "is-surge-fx" : "",
    isBossHitShake ? "is-boss-shake" : "",
    isLevelUpFlash ? "is-levelup-fx" : "",
  ].filter(Boolean).join(" ");

  useEffect(() => {
    setEnemyImageBroken(false);
  }, [renderableEnemyImage, state.zone, state.stage, enemyName]);

  return (
    <GameShell
      title="IdleStory World"
      subtitle={`${zone.region} - Lv.${state.level}`}
      icon="IW"
      aspectRatio="9 / 16"
    >
      <div className="isw">

        {/* ◆◆◆◆ TOP HUD ◆◆◆◆ */}
        <div className="isw-hud">
          <div className="isw-hud__currencies">
            <div className={`isw-hud__chip isw-hud__chip--gold${incomeRates.isCapped ? " isw-hud__chip--capped" : ""}${isGoldBumping ? " is-bumping" : ""}`}>
              <span className="isw-hud__chip-icon">$</span>
              <span className="isw-hud__chip-val">{formatNumber(state.mesos)}</span>
            </div>
            <div className={`isw-hud__chip isw-hud__chip--crystal${state.crystals >= 500 ? " isw-hud__chip--capped" : ""}`}>
              <span className="isw-hud__chip-icon">C</span>
              <span className="isw-hud__chip-val">{Math.floor(state.crystals)}/500</span>
            </div>
            <div className="isw-hud__chip isw-hud__chip--relic">
              <span className="isw-hud__chip-icon">R</span>
              <span className="isw-hud__chip-val">{formatNumber(state.relics)}</span>
            </div>
            <div className="isw-hud__chip isw-hud__chip--fame">
              <span className="isw-hud__chip-icon">F</span>
              <span className="isw-hud__chip-val">{formatNumber(state.fame)}</span>
            </div>
          </div>
          <div className="isw-hud__meta">
            <span className="isw-hud__level">Lv.{state.level}</span>
            <div className={`isw-hud__xp${isXpLevelup ? " is-levelup" : ""}`}>
              <div className="isw-hud__xp-fill" style={{ width: `${xpProgress}%` }} />
              {nextMilestone && (
                <div
                  className="isw-hud__milestone-tick"
                  style={{ left: `${Math.min(98, ((nextMilestone.level - state.level) / Math.max(1, nextMilestone.level)) * 100)}%` }}
                  title={`Milestone at Lv.${nextMilestone.level}: ${nextMilestone.description}`}
                />
              )}
            </div>
            <span className={`isw-hud__dps${surgeActive ? " is-surge" : ""}`}>
              DPS {formatNumber(dps)}/s
              {surgeActive && <span className="isw-hud__surge-tag">SURGE</span>}
            </span>
            <span
              className="isw-hud__power"
              style={{ color: powerTier.color }}
              title={`${powerTier.label} rank`}
            >
              PR {formatPowerRating(powerRating)}
            </span>
          </div>
        </div>

        {/* ◆◆◆◆ COMBAT ARENA ◆◆◆◆ */}
        <div className={[
          "isw-arena",
          arenaFxClass,
          `is-theme-${zone.theme}`,
          isBossEnraged ? "is-enraged" : "",
          isBoss && enemyHpPct <= 25 ? "is-boss-danger" : "",
          isKillFlash   ? "is-kill-flash" : "",
          isStageClear  ? "is-stage-clear" : "",
        ].filter(Boolean).join(" ")}>
          {/* Zone background — layered: gradient fallback → map image → tint → overlay → vignette */}
          <div
            className="isw-arena__bg"
            style={{ background: zone.background }}
          />
          {mapBg && (
            <div
              className="isw-arena__map-img"
              style={{ backgroundImage: `url(${mapBg.image})` }}
            />
          )}
          {mapBg?.tint && (
            <div
              className="isw-arena__map-tint"
              style={{ background: mapBg.tint }}
            />
          )}
          <div
            className="isw-arena__map-overlay"
            style={mapBg ? { background: mapBg.overlay } : undefined}
          />
          <div className="isw-arena__bg-overlay" />
          <div className="isw-arena__ambient" />
          <div className="isw-arena__speed-lines" />
          <div className="isw-arena__impact-ring" />
          <div className="isw-arena__loot-sparks" />
          <div className="isw-arena__boss-warning" />

          {/* Floating damage numbers */}
          <div className="isw-dmg-layer">
            <AnimatePresence>
              {feelBursts.map(burst => (
                <motion.div
                  key={burst.id}
                  className={`isw-feel-burst isw-feel-burst--${burst.kind}`}
                  initial={{ opacity: 0.95, scale: 0.35 }}
                  animate={{ opacity: 0, scale: burst.kind === "crit" ? 1.65 : 1.25 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              ))}
              {dmgNums.map(n => (
                n.value === 0 ? null :
                <motion.div
                  key={n.id}
                  className={`isw-dmg-num isw-dmg-num--${n.kind}`}
                  style={{ left: `${n.x}%`, top: "45%" }}
                  initial={{ opacity: 1, y: 0, scale: n.kind === "crit" ? 1.4 : 1 }}
                  animate={{ opacity: 0, y: -64, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {n.kind === "incoming" ? "-" : n.kind === "crit" ? "CRIT " : ""}{formatNumber(n.value)}
                </motion.div>
              ))}
              {goldPops.map((entry) => (
                <motion.div
                  key={entry.id}
                  className="isw-gold-pop"
                  initial={{ opacity: 0, y: 8, scale: 0.88 }}
                  animate={{ opacity: 1, y: -26, scale: 1 }}
                  exit={{ opacity: 0, y: -52, scale: 1.04 }}
                  transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
                >
                  +{formatNumber(entry.value)} Mesos
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {bossIntro && (
              <motion.div
                className="isw-boss-intro"
                initial={{ opacity: 0, y: -10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="isw-boss-intro__tag">Boss Encounter</span>
                <strong className="isw-boss-intro__title">{bossIntro.title}</strong>
                <span className="isw-boss-intro__sub">{bossIntro.subtitle}</span>
              </motion.div>
            )}
            {rewardText && (
              <motion.div
                className="isw-reward-pop"
                initial={{ opacity: 0, y: 14, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {rewardText}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active world event banner */}
          <AnimatePresence>
            {(state.activeEvents ?? []).length > 0 && (state.activeEvents ?? [])[0] && (
              <motion.div
                key={(state.activeEvents ?? [])[0].id}
                className="isw-event-banner"
                style={{ "--event-color": (state.activeEvents ?? [])[0].color } as React.CSSProperties}
                initial={{ opacity: 0, y: -20, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              >
                <span className="isw-event-banner__icon">
                  {sanitizeGameText((state.activeEvents ?? [])[0].icon, "!")}
                </span>
                <div className="isw-event-banner__body">
                  <span className="isw-event-banner__label">
                    {sanitizeGameText((state.activeEvents ?? [])[0].label, "World Event")}
                  </span>
                  <span className="isw-event-banner__desc">
                    {sanitizeGameText((state.activeEvents ?? [])[0].description, "Event active")}
                  </span>
                </div>
                <span className="isw-event-banner__timer">
                  {Math.ceil((state.activeEvents ?? [])[0].remainingSeconds)}s
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stage badge */}
          <div className="isw-arena__stage">
            <span className={`isw-arena__stage-badge${isBoss ? " is-boss" : isElite ? " is-elite" : ""}`}>
              {activeDungeonRun
                ? `${DUNGEON_DEFINITIONS[activeDungeonRun.type].icon} ${DUNGEON_DEFINITIONS[activeDungeonRun.type].name} - Wave ${activeDungeonRun.wave}/${activeDungeonRun.totalWaves}${activeDungeonRun.isBossWave ? " - FINAL BOSS" : ""}`
                : isBoss
                  ? `BOSS - Stage ${state.stage}`
                  : isElite
                    ? `ELITE - Stage ${state.stage}`
                    : `Stage ${state.stage} - ${zone.name}`}
            </span>
            <span className="isw-arena__location-tag">{mapLocationName}</span>
            {/* Power gate warning pill */}
            {(powerStatus === "underpowered" || powerStatus === "blocked") && !isBoss && (
              <span className={`isw-power-pill isw-power-pill--${powerStatus}`}>
                {powerStatus === "blocked" ? "Blocked" : "Slowed"} {Math.round(progMult * 100)}%
              </span>
            )}
          </div>

          <div className="isw-engagement-strip">
            <div className={`isw-engagement-chip${momentumTier > 0 ? " is-live" : ""}`}>
              <span>Momentum</span>
              <strong>Tier {momentumTier}</strong>
              <small>{streakToNext > 0 ? `${streakToNext} kills to next` : "Max tier reached"}</small>
            </div>
            <div className={`isw-engagement-chip${objectivePct >= 100 ? " is-live" : ""}`}>
              <span>Objective</span>
              <strong>{state.activeObjective.label}</strong>
              <small>{formatNumber(state.activeObjective.progress)} / {formatNumber(state.activeObjective.target)}</small>
              <div className="isw-engagement-chip__bar">
                <div style={{ width: `${objectivePct}%` }} />
              </div>
            </div>
            <div className="isw-engagement-chip">
              <span>Next unlock</span>
              <strong>{nextZoneLabel}</strong>
              <small>{nextZoneHint}</small>
            </div>
          </div>

          <div className={`isw-combat-clarity${enemyHitPulse ? " is-player-hit" : ""}`}>
            <div className="isw-combat-clarity__meta">
              <span className="isw-combat-clarity__zone">{zone.name}</span>
              <span className="isw-combat-clarity__stage">Stage {state.stage}</span>
            </div>
            <div className="isw-combat-clarity__row">
              <span className="isw-combat-clarity__label">Player HP</span>
              <span className="isw-combat-clarity__value">
                {formatNumber(playerHpDisplay)} / {formatNumber(playerMaxHp)}
              </span>
            </div>
            <div className="isw-combat-clarity__track">
              <div className="isw-combat-clarity__fill is-player" style={{ width: `${playerHpPct}%` }} />
            </div>
            <div className="isw-combat-clarity__row">
              <span className="isw-combat-clarity__label">Enemy Attack</span>
              <span className="isw-combat-clarity__value">
                {formatNumber(enemyAttackPerSecond)}/s
              </span>
            </div>
            <div className="isw-combat-clarity__track">
              <div className="isw-combat-clarity__fill is-enemy" style={{ width: `${enemyAttackProgress}%` }} />
            </div>
          </div>

          {/* Enemy sprite — hidden during boss fights (BossPanel renders the sprite instead) */}
          {!isBoss && (
            <div className="isw-arena__enemy">
              <motion.div
                key={`${state.zone}-${state.stage}-${enemyName}`}
                className={`isw-arena__enemy-sprite${isHit ? " is-hit" : ""}${isElite ? " is-elite" : ""}`}
                initial={{ opacity: 0, y: 14, scale: 0.82, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 340, damping: 20 }}
              >
                {renderableEnemyImage && !enemyImageBroken ? (
                  <img
                    src={renderableEnemyImage}
                    alt={enemyName}
                    loading="lazy"
                    decoding="async"
                    onError={() => setEnemyImageBroken(true)}
                  />
                ) : (
                  <span className="isw-arena__emoji" role="img" aria-label={enemyName}>
                    {safeEnemyPortrait}
                  </span>
                )}
              </motion.div>
            </div>
          )}

          {/* Enemy info — hidden during boss fights (BossPanel has its own HP bar) */}
          {!isBoss && (
            <div className="isw-arena__enemy-info">
              <div className="isw-arena__enemy-name">
                {enemyName}
                {state.prestigeCount > 0 && (
                  <span className="isw-prestige-badge" style={{ marginLeft: 6 }}>x{state.prestigeCount}</span>
                )}
              </div>
              <div className="isw-arena__enemy-hint">
                <span>
                  {sanitizeGameText(
                    monsterIdentity?.roleIdentity ?? monsterIdentity?.specialTrait ?? visualIdentity.monsterCue,
                    "Wild encounter"
                  )}
                </span>
                {monsterIdentity?.elementalType && (
                  <span>{sanitizeGameText(monsterIdentity.elementalType, "neutral")}</span>
                )}
              </div>
              <div className="isw-arena__hp-label">
                <span>HP</span>
                <span>{formatNumber(displayEnemyHp)} / {formatNumber(displayEnemyMaxHp)}</span>
              </div>
              <div className="isw-arena__hp-track">
                <div
                  className="isw-arena__hp-fill"
                  data-pct={hpTier}
                  style={{ width: `${enemyHpPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Power gate indicator — shown when player DPS is below zone requirement */}
          <AnimatePresence>
            {progressionHint && !isBoss && (
              <motion.div
                className={`isw-power-gate isw-power-gate--${progressionHint.urgency}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
              >
                <div className="isw-power-gate__bar">
                  <div
                    className="isw-power-gate__fill"
                    style={{ width: `${Math.min(100, (dps / zonePowerReq) * 100)}%` }}
                  />
                  <span className="isw-power-gate__label">
                    DPS {formatNumber(dps)} / {formatNumber(zonePowerReq)} req
                  </span>
                </div>
                <div className="isw-power-gate__hint">
                  <span className="isw-power-gate__reason">{progressionHint.reason}</span>
                  <span className="isw-power-gate__suggestion">{progressionHint.suggestion}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Boss mechanic — shown as a subtle tag under the enemy hint, not a full banner */}
          {isBoss && zoneBossEffect && (
            <div className="isw-arena__boss-effect-tag">
              {zoneBossEffect.icon} <span>{zoneBossEffect.name}</span>
            </div>
          )}

          {/* Toast inside arena */}
          <div className="isw-toast">{sanitizeGameText(toast, "Ready")}</div>
          {!!combatFeed.length && (
            <div className="isw-combat-feed" aria-live="polite">
              <AnimatePresence>
                {combatFeed.map((entry) => (
                  <motion.div
                    key={entry.id}
                    className={`isw-combat-feed__item is-${entry.tone}`}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span>{sanitizeGameText(entry.label, "Combat")}</span>
                    <strong>{sanitizeGameText(entry.value, "--")}</strong>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Boss surge active indicator */}
          {surgeActive && !isBoss && (
            <div className="isw-surge-badge">
              <span className="isw-surge-badge__icon">!</span>
              <span className="isw-surge-badge__text">SURGE x2</span>
              <span className="isw-surge-badge__timer">{Math.ceil(state.bossSurgeSecondsLeft)}s</span>
            </div>
          )}

          {/* Power spike overlay — milestone or boss surge */}
          <AnimatePresence>
            {powerSpike && (
              <motion.div
                key={powerSpike.label}
                className={`isw-power-spike${powerSpike.isWow ? " is-wow" : ""}`}
                initial={{ opacity: 0, scale: 1.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88, y: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="isw-power-spike__shockwave" />
                <span className="isw-power-spike__icon">{powerSpike.icon}</span>
                <span className="isw-power-spike__label">{powerSpike.label}</span>
                <span className="isw-power-spike__desc">{powerSpike.description}</span>
                {powerSpike.sub && (
                  <span className="isw-power-spike__sub">{powerSpike.sub}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* First loot drop visual */}
          <AnimatePresence>
            {lootDropVisible && (
              <motion.div
                className="isw-loot-drop"
                initial={{ opacity: 1, y: 0, scale: 0.7 }}
                animate={{ opacity: 0, y: -90, scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
              >
                Lucky Drop!
              </motion.div>
            )}
          </AnimatePresence>

          {/* WOW moment overlay — first kill / first level-up */}
          <AnimatePresence>
            {wowMoment && (
              <motion.div
                className="isw-wow-overlay"
                initial={{ opacity: 0, scale: 1.3 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="isw-wow-overlay__ring" />
                <span className="isw-wow-overlay__emoji">{wowMoment.emoji}</span>
                <span className="isw-wow-overlay__text">{wowMoment.text}</span>
                <span className="isw-wow-overlay__sub">{wowMoment.sub}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Boss overlay — dramatic full-arena boss panel */}
          <AnimatePresence>
            {isBoss && (
              <motion.div
                key="boss-overlay"
                initial={{ opacity: 0, scale: 1.05, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.9 }}
                style={{ position: "absolute", inset: 0, zIndex: 10 }}
              >
                <Suspense fallback={null}>
                  <BossPanel
                    zone={zone}
                    monster={currentMonster}
                    hpPct={enemyHpPct}
                    enemyHp={displayEnemyHp}
                    enemyMaxHp={displayEnemyMaxHp}
                    stage={activeDungeonRun?.wave ?? state.stage}
                    isHit={isHit}
                    onRaid={handleRaidBoss}
                    onHunt={handleHunt}
                    rewardMesos={Math.round(mesosPerSecond * 8)}
                    rewardCrystals={state.prestigeCount + 1}
                    bossDefinition={bossDefinition}
                    currentPhase={bossPhase}
                    activeMechanicId={activeMechanicId}
                    mechanicTimeLeft={mechanicTimeLeft}
                    enrageTimeLeft={enrageTimeLeft}
                    isEnraged={isBossEnraged}
                    voiceLine={bossVoiceLine}
                  />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ◆◆◆◆ TUTORIAL HINT BAR ◆◆◆◆ */}
        <AnimatePresence>
          {tutorialHint && tutorialStep !== "done" && (
            <motion.div
              key={tutorialStep}
              className={`isw-tutorial-hint isw-tutorial-hint--${tutorialHint.target ? "actionable" : "passive"}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              <span className="isw-tutorial-hint__icon">
                {tutorialStep === "intro" ? "!" : tutorialStep === "heroes_tab" ? "H" : tutorialStep === "buy_hero" ? "$" : "OK"}
              </span>
              <div className="isw-tutorial-hint__body">
                <span className="isw-tutorial-hint__text">{tutorialHint.text}</span>
                <span className="isw-tutorial-hint__sub">{tutorialHint.sub}</span>
              </div>
              {tutorialHint.target === "heroes_tab" && (
                <span className="isw-tutorial-hint__arrow">-&gt; Heroes</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ◆◆◆◆ BOTTOM TABS ◆◆◆◆ */}
        <div className="isw-tabs">
          {/* Tab panel */}
          <div className="isw-tab-panel">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {tab === "combat" && (
                  <CombatTab
                    state={state}
                    isBoss={isBoss}
                    currentMonster={currentMonster}
                    rebirthPreview={rebirthPreview}
                    onHunt={handleHunt}
                    onRaid={handleRaidBoss}
                    onPrestige={handlePrestige}
                    onRebirth={handleRebirth}
                    retentionSummary={retentionSummary}
                    onClaimDaily={handleClaimDailyReward}
                    onClaimComeback={handleClaimComebackReward}
                    onReadNotifications={handleReadNotifications}
                    powerRating={powerRating}
                    powerTier={powerTier}
                    nextMilestone={nextMilestone}
                    surgeSecondsLeft={state.bossSurgeSecondsLeft}
                    dps={dps}
                    activeShopBoosts={activeShopBoosts}
                    microMissions={state.microMissions ?? []}
                    onClaimMicroMission={handleClaimMicroMission}
                  />
                )}
                {tab === "heroes" && (
                  <Suspense fallback={<TabPanelFallback label="Loading heroes..." />}>
                    <HeroesPanel
                      state={state}
                      onBuyHero={handleBuyHero}
                      onBuyUpgrade={handleBuyUpgrade}
                      onTrainSkill={handleTrainSkill}
                      onBestHero={() => dispatch(buyBestHero(state))}
                      onBestUpgrade={() => dispatch(buyBestUpgrade(state))}
                      onBestSkill={() => dispatch(trainBestSkill(state))}
                      tutorialTarget={tutorialHint?.target ?? null}
                    />
                  </Suspense>
                )}
                {tab === "inventory" && (
                  <Suspense fallback={<TabPanelFallback label="Loading inventory..." />}>
                    <InventoryPanel
                      state={state}
                      items={items}
                      onBuyGear={handleBuyGear}
                      onBestGear={() => dispatch(buyBestGear(state))}
                      onEquipLoot={handleEquipLoot}
                      onUnequipLoot={handleUnequipLoot}
                      onAutoEquipLoot={handleAutoEquipLoot}
                      onEnhanceLoot={handleEnhanceLoot}
                      onRerollLoot={handleRerollLoot}
                      onSalvageLoot={handleSalvageLoot}
                      onCraftLoot={handleCraftLoot}
                    />
                  </Suspense>
                )}
                {tab === "class" && (
                  !state.classId
                    ? <ClassPickTab onSelect={handleSelectClass} />
                    : <ClassTab
                        state={state}
                        skills={classSkills}
                        maxResource={maxResource}
                        resourcePct={resourcePct}
                        regenMult={getActiveRegenMult(state.activeBuffs)}
                        level={state.level}
                        onActivate={handleActivateSkill}
                        onSwitch={handleSelectClass}
                        onSetBuildFocus={handleSetBuildFocus}
                        onSetSkillBranch={handleSetSkillBranch}
                      />
                )}
                {tab === "economy" && (
                  <EconomyTab
                    state={state}
                    preview={rebirthPreview}
                    incomePerSec={incomeRates.goldPerSec}
                    isCapped={incomeRates.isCapped}
                    onBuyGlobalMult={handleBuyGlobalMult}
                    onUpgradeRelic={handleUpgradeRelic}
                    onPrestige={handlePrestige}
                    onRebirth={handleRebirth}
                  />
                )}
                {tab === "shop" && (
                  <ShopTab
                    state={state}
                    rewardedAdCooldowns={rewardedAdCooldowns}
                    claimableFreePassTiers={claimableFreePassTiers}
                    claimablePremiumPassTiers={claimablePremiumPassTiers}
                    onBuyShopOffer={handleBuyShopOffer}
                    onWatchRewardedAd={handleWatchRewardedAd}
                    onClaimSeasonPassTier={handleClaimSeasonPassTier}
                  />
                )}
                {tab === "zones" && (
                  <ZoneTab
                    state={state}
                    progress={zoneProgress}
                    onChangeZone={handleChangeZone}
                    onStartDungeon={handleStartDungeon}
                    setToast={setToast}
                  />
                )}
                {tab === "talents" && (
                  <Suspense fallback={<TabPanelFallback label="Loading talents..." />}>
                    <TalentTreePanel
                      state={state}
                      onBuyTalent={handleBuyTalent}
                    />
                  </Suspense>
                )}
                {tab === "social" && (
                  <Suspense fallback={<TabPanelFallback label="Loading social..." />}>
                    <SocialPanel
                      user={user}
                      guildState={state.guildState}
                      guilds={socialGuilds}
                      currentGuild={currentGuild}
                      guildDraft={guildName}
                      onGuildDraftChange={setGuildName}
                      onLogin={openAuth}
                      onCreateGuild={handleCreateGuild}
                      onJoinGuild={handleJoinGuild}
                      onLeaveGuild={handleLeaveGuild}
                      onRaidGuildBoss={handleGuildRaidBoss}
                      leaderboards={leaderboards}
                      leaderboardCategory={leaderboardCategory}
                      onLeaderboardCategoryChange={setLeaderboardCategory}
                      currentRanks={state.leaderboardState.currentRanks}
                      weeklyRanking={weeklyRanking}
                      weeklyRank={weeklyRank}
                      canClaimWeeklyReward={canClaimWeeklyRewardNow}
                      onClaimWeeklyReward={handleClaimWeeklyReward}
                      pvpState={state.pvpState}
                      shadowOpponents={shadowOpponents}
                      onShadowBattle={handleShadowBattle}
                      status={socialStatus}
                    />
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Save data controls */}
          <div className="isw-save-bar">
            <button
              className="isw-save-bar__toggle"
              onClick={() => setSaveMenuOpen((v) => !v)}
              aria-expanded={saveMenuOpen}
              title="Export or import your save data"
            >
              {saveMenuOpen ? "▼ Save Data" : "▶ Save Data"}
            </button>
            {saveMenuOpen && (
              <div className="isw-save-bar__panel">
                <button className="isw-save-bar__btn" onClick={handleExportSave}>
                  Export Save
                </button>
                <div className="isw-save-bar__import-row">
                  <input
                    className="isw-save-bar__input"
                    type="text"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste save string here…"
                    aria-label="Import save string"
                  />
                  <button
                    className="isw-save-bar__btn"
                    onClick={handleImportSave}
                    disabled={!importText.trim()}
                  >
                    Import Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tab nav */}
          <nav className="isw-tab-nav">
            {([
              { id: "combat",    icon: "ATK", label: "Combat"  },
              { id: "heroes",    icon: "H",   label: "Heroes"  },
              { id: "inventory", icon: "BAG", label: "Bag"     },
              { id: "class",     icon: "CLS", label: "Class"   },
              { id: "economy",   icon: "$",   label: "Economy" },
              { id: "shop",      icon: "S",   label: "Shop"    },
              { id: "zones",     icon: "Z",   label: "Zones"   },
              { id: "talents",   icon: "T",   label: "Talents" },
            ] as const).map(({ id, icon, label }) => (
              <motion.button
                key={id}
                className={`isw-tab-nav__btn${tab === id ? " is-active" : ""}${tutorialStep === "heroes_tab" && id === "heroes" ? " isw-tutorial-glow" : ""}`}
                onClick={() => handleTabChange(id)}
                whileTap={{ scale: 0.88 }}
                type="button"
              >
                <span className="isw-tab-nav__btn-icon">{icon}</span>
                {label}
                {id === "economy" && rebirthPreview.canPrestige && (
                  <span className="isw-tab-nav__badge" />
                )}
                {id === "class" && !state.classId && (
                  <span className="isw-tab-nav__badge" />
                )}
                {id === "combat" && retentionSummary.hasAttention && (
                  <span className="isw-tab-nav__badge" />
                )}
                {id === "inventory" && items.length > 0 && (
                  <span className="isw-tab-nav__badge" />
                )}
                {id === "talents" && (state.talentPoints ?? 0) > 0 && (
                  <span className="isw-tab-nav__badge" />
                )}
                {id === "shop" && shopAttention && (
                  <span className="isw-tab-nav__badge" />
                )}
                {/* Tutorial arrow badge on Heroes tab */}
                {tutorialStep === "heroes_tab" && id === "heroes" && (
                  <span className="isw-tutorial-arrow-badge">^</span>
                )}
              </motion.button>
            ))}
            <motion.button
              className={`isw-tab-nav__btn${tab === "social" ? " is-active" : ""}`}
              onClick={() => handleTabChange("social")}
              whileTap={{ scale: 0.88 }}
              type="button"
            >
              <span className="isw-tab-nav__btn-icon">SOC</span>
              Social
              {(canClaimWeeklyRewardNow || shadowOpponents.length > 0 || Boolean(state.guildState.guildId)) && (
                <span className="isw-tab-nav__badge" />
              )}
            </motion.button>
          </nav>
        </div>

      </div>
    </GameShell>
  );
}

function TabPanelFallback({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" style={{ padding: "1rem 0", opacity: 0.72 }}>
      {label}
    </div>
  );
}

// ── Re-exports (type-only; value re-exports removed for Fast Refresh compatibility)
export type { IdleGameState, WorldZone, DatabaseMap, DatabaseMonster, DatabaseItem } from "./idlestory/gameEngine";
