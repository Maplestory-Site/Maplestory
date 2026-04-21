import "./IdleStoryWorld.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameShell } from "./shared/GameShell";
import { updateGameMeta } from "./shared/gameMeta";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { useMockAuth } from "../../../features/profile/MockAuthContext";
import {
  buyGear,
  buyBestGear,
  buyBestHero,
  buyBestUpgrade,
  buyGlobalMult,
  buyHero,
  buyUpgrade,
  autoEquipBestLoot,
  activateClassSkill,
  calculateOfflineGains,
  claimDailyReward,
  claimMissionReward,
  claimBossKillFreeUpgrade,
  changeZone,
  equipLootItem,
  formatNumber,
  gameTick,
  getRetentionSummary,
  huntBurst,
  loadGameState,
  markNotificationsRead,
  MISSION_DEFINITIONS,
  prestigeWorld,
  raidBoss,
  rebirthWorld,
  saveGameState,
  selectClass,
  trainBestSkill,
  trainSkill,
  unequipLootItem,
  upgradeRelic,
  buyTalent,
  type ClassId,
  type ClassSkillId,
  type DatabaseItem,
  type DatabaseMap,
  type DatabaseMonster,
  type GlobalMultId,
  type IdleGameState,
  type IdleItemType,
  type MissionId,
  type RelicUpgradeId,
  type TalentNodeId,
  type WorldZone
} from "./idlestory/gameEngine";
import {
  calculateDPS,
  computeScore,
  GEAR,
  getGearCost,
  getGearEffect,
  getSkillCost,
  getSkillEffect,
  getCurrentMonster,
  getFeaturedLoot,
  getHeroCost,
  getMesosPerSecond,
  getUpgradeCost,
  getUpgradeEffect,
  getXpTarget,
  HEROES,
  SKILLS,
  UPGRADES
} from "./idlestory/progressionSystem";
import { getEnemyHpPercent, isBossStage } from "./idlestory/combatSystem";
import {
  getZonePowerRequirement,
  getProgressionMultiplier,
  getPowerStatus,
  getProgressionHint,
  isEliteStage
} from "./idlestory/progressionGates";
import { CLASSES, getClassMaxHp } from "./idlestory/classSystem";
import {
  getAllClassSkills,
  getActiveRegenMult,
  SKILL_DEFINITIONS,
  type SkillDefinition as ClassSkillDefinition
} from "./idlestory/skillSystem";
import {
  GLOBAL_MULTIPLIERS,
  getGlobalMultCost,
  getIncomeRates
} from "./idlestory/economySystem";
import {
  RELIC_UPGRADES,
  getRelicUpgradeCost,
  getRebirthPreview,
  type RebirthPreview,
  type RelicUpgradeDef
} from "./idlestory/rebirthSystem";
import {
  ALL_ZONES,
  getFullZoneOrFirst,
  getZoneUnlockStatus,
  getZoneBossEffect,
  getZoneProgressSummary,
  getStageEnemy
} from "./idlestory/zoneSystem";
import { getThemeVisualIdentity, getZoneBackground } from "./idlestory/mapBackgrounds";
import {
  createGuild,
  fetchGlobalChat,
  fetchGuilds,
  joinGuild,
  loadIdleCloudSave,
  saveIdleCloudSave,
  sendGlobalChat,
  submitIdleLeaderboard,
  type ChatMessage,
  type Guild
} from "./idlestory/onlineIdleService";
import { BossPanel }        from "./idlestory/ui/BossPanel";
import { InventoryPanel }   from "./idlestory/ui/InventoryPanel";
import { HeroesPanel }      from "./idlestory/ui/HeroesPanel";
import { TalentTreePanel }  from "./idlestory/ui/TalentTreePanel";
import { getBossDefinition } from "./idlestory/bossSystem";
import {
  calculatePowerRating,
  formatPowerRating,
  getPowerTier,
  isMilestoneLevel,
  getMilestoneAtLevel,
  getNextMilestone,
  BOSS_SURGE_SECONDS,
  type MilestoneBonus
} from "./idlestory/powerSpikeSystem";
import {
  type TutorialState,
  type TutorialStepId,
  DEFAULT_TUTORIAL,
  getTutorialHint,
  advanceTutorialOnKill,
  advanceTutorialOnTabOpen,
  advanceTutorialOnUpgrade,
  checkTutorialComplete,
  isTutorialActive,
  isNewPlayer
} from "./idlestory/tutorialSystem";
import {
  createBossFightState,
  tickBossFight,
  computeBossDpsMultiplier,
  getMechanicTimeLeft,
  type BossFightState
} from "./idlestory/bossMechanics";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_GAME_MONSTERS = 50;
const MAX_GAME_ITEMS    = 50;
const MAX_GAME_LEVEL    = 100;
const MAX_GAME_MAPS     = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

type DmgNumber = {
  id: number;
  value: number;
  kind: "normal" | "crit" | "boss" | "kill";
  x: number; // percent
};

type FeelBurst = {
  id: number;
  kind: "hit" | "crit" | "kill" | "level";
};

type TabId = "combat" | "heroes" | "inventory" | "class" | "economy" | "zones" | "talents" | "online";

// ─── Database helpers ─────────────────────────────────────────────────────────

async function fetchDatabase<T>(url: string): Promise<T[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}`);
  const payload = await res.json();
  if (Array.isArray(payload)) return payload as T[];
  const d = payload as { data?: T[]; items?: T[]; maps?: T[]; monsters?: T[] };
  return d.items ?? d.data ?? d.maps ?? d.monsters ?? [];
}

function limitMonsters(arr: DatabaseMonster[]) {
  return arr.filter(m => m.level <= MAX_GAME_LEVEL).sort((a, b) => a.level - b.level).slice(0, MAX_GAME_MONSTERS);
}

function limitItems(arr: DatabaseItem[]) {
  return arr.filter(i => i.level === null || i.level <= MAX_GAME_LEVEL).sort((a, b) => (a.level ?? 0) - (b.level ?? 0)).slice(0, MAX_GAME_ITEMS);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IdleStoryWorldGame() {
  const { playFailure, playSuccess, playHit, playCrit, playLevelUp, playReward } = useMiniGamesSound();
  const { user, openAuth } = useMockAuth();

  // ── Database ───────────────────────────────────────────────────────────────
  const [maps,     setMaps]     = useState<DatabaseMap[]>([]);
  const [monsters, setMonsters] = useState<DatabaseMonster[]>([]);
  const [items,    setItems]    = useState<DatabaseItem[]>([]);
  const [toast, setToast] = useState("Loading Maple World…");

  // ── Game state ─────────────────────────────────────────────────────────────
  const [state, setState] = useState<IdleGameState>(() => loadGameState());
  const [tab, setTab] = useState<TabId>("combat");
  const [dmgNums, setDmgNums] = useState<DmgNumber[]>([]);
  const [feelBursts, setFeelBursts] = useState<FeelBurst[]>([]);
  const [rewardText, setRewardText] = useState("");
  const dmgIdRef = useRef(0);
  const feelBurstIdRef = useRef(0);
  const prevHpRef = useRef({ hp: state.enemyHp, stage: state.stage });
  const prevLevelRef = useRef(state.level);
  const hitRef = useRef(false);
  const [isHit, setIsHit] = useState(false);
  // ── Polish: feedback states ───────────────────────────────────────────────
  const [isKillFlash, setIsKillFlash]       = useState(false);
  const [isStageClear, setIsStageClear]     = useState(false);
  const [isGoldBumping, setIsGoldBumping]   = useState(false);
  const [isXpLevelup, setIsXpLevelup]       = useState(false);
  const prevMesosRef = useRef(state.mesos);
  const goldBumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [guildName, setGuildName] = useState("Snail Legends");
  const [onlineStatus, setOnlineStatus] = useState("Local save active");
  const stateRef = useRef(state);
  const scoreRef = useRef(0);

  // ── Boss fight state ───────────────────────────────────────────────────────
  const bossFightRef = useRef<BossFightState | null>(null);
  const prevIsBossRef = useRef(false);
  const [bossPhase, setBossPhase] = useState<1 | 2 | 3>(1);
  const [activeMechanicId, setActiveMechanicId] = useState<string | null>(null);
  const [mechanicTimeLeft, setMechanicTimeLeft] = useState(0);
  const [enrageTimeLeft, setEnrageTimeLeft] = useState(0);
  const [isBossEnraged, setIsBossEnraged] = useState(false);
  const [bossVoiceLine, setBossVoiceLine] = useState<string | null>(null);
  const bossDpsMultiplierRef = useRef(1.0);

  // ── Tutorial / new-player experience ─────────────────────────────────────
  const [tutorial, setTutorial] = useState<TutorialState>(() =>
    isNewPlayer(state.totalPlayTime) ? DEFAULT_TUTORIAL : { ...DEFAULT_TUTORIAL, step: "done" }
  );
  const tutorialStep: TutorialStepId = tutorial.step;
  const tutorialHint = getTutorialHint(tutorialStep);
  // WOW moment overlay (first kill + first level 2)
  const [wowMoment, setWowMoment] = useState<{ emoji: string; text: string; sub: string } | null>(null);
  // First loot drop (visual only)
  const [lootDropVisible, setLootDropVisible] = useState(false);
  // Track previous kill count to detect first kill
  const prevLifetimeKillsRef = useRef(state.lifetimeKills);
  // Track previous level to detect level 2 specifically
  const prevTutorialLevelRef = useRef(state.level);

  // ── Power spike system ─────────────────────────────────────────────────────
  /** Full-screen power spike overlay (milestone hit / boss surge / free upgrade). */
  const [powerSpike, setPowerSpike] = useState<{
    icon: string; label: string; description: string; isWow: boolean; sub?: string;
  } | null>(null);
  /** Track boss kills to detect new kills. */
  const prevBossKillsRef  = useRef(state.lifetimeBossKills);
  /** Track level for milestone detection (separate from tutorial ref). */
  const prevMilestoneLevelRef = useRef(state.level);

  // ── Derived ────────────────────────────────────────────────────────────────
  const zone = useMemo(() => getFullZoneOrFirst(state.zone), [state.zone]);
  const mapBg = useMemo(() => getZoneBackground(zone.id), [zone.id]);
  const visualIdentity = useMemo(() => getThemeVisualIdentity(zone.theme), [zone.theme]);
  const currentMonster = useMemo(
    () => getCurrentMonster(state, zone, monsters),
    [state, zone, monsters]
  );
  const featuredLoot = useMemo(() => getFeaturedLoot(currentMonster, items), [currentMonster, items]);
  const dps = useMemo(() => calculateDPS(state), [state]);
  const mesosPerSecond = useMemo(() => getMesosPerSecond(state, zone, currentMonster, featuredLoot.length), [state, zone, currentMonster, featuredLoot.length]);
  const xpTarget = getXpTarget(state.level);
  const xpProgress = Math.min(100, (state.xp / xpTarget) * 100);
  const enemyHpPct = getEnemyHpPercent(state);
  const isBoss = isBossStage(state.stage);
  const zoneBossEffect = useMemo(() => isBoss ? getZoneBossEffect(zone) : null, [isBoss, zone]);
  const zoneProgress = useMemo(() => getZoneProgressSummary(state, state.zone), [state]);
  const stageEnemy = useMemo(() => getStageEnemy(zone, state.stage), [zone, state.stage]);
  const incomeRates = useMemo(() => getIncomeRates(state, mesosPerSecond), [state, mesosPerSecond]);
  const rebirthPreview = useMemo(() => getRebirthPreview(state), [state]);
  const activeClass = state.classId ? CLASSES[state.classId] : null;
  const maxResource = activeClass?.maxResource ?? 0;
  const resourcePct = maxResource > 0 ? Math.min(100, (state.resource / maxResource) * 100) : 0;
  const classSkills = useMemo(() => state.classId ? getAllClassSkills(state.classId) : [], [state.classId]);
  const score = useMemo(() => computeScore(state, dps, maps.length, monsters.length, items.length), [state, dps, maps.length, monsters.length, items.length]);
  const retentionSummary = useMemo(() => getRetentionSummary(state), [state]);
  const bossDefinition = useMemo(() => isBoss ? getBossDefinition(state.zone) : null, [isBoss, state.zone]);

  // ── Power rating ──────────────────────────────────────────────────────────
  const powerRating   = useMemo(() => calculatePowerRating(dps, state.level, state.prestigeCount), [dps, state.level, state.prestigeCount]);
  const powerTier     = useMemo(() => getPowerTier(powerRating), [powerRating]);
  const nextMilestone = useMemo(() => getNextMilestone(state.level), [state.level]);
  const surgeActive   = state.bossSurgeSecondsLeft > 0;

  // ── Power gate (progression wall) ─────────────────────────────────────────
  const isElite       = isEliteStage(state.stage);
  const zonePowerReq  = useMemo(() => getZonePowerRequirement(zone), [zone]);
  const progMult      = useMemo(() => getProgressionMultiplier(dps, zonePowerReq), [dps, zonePowerReq]);
  const powerStatus   = useMemo(() => getPowerStatus(dps, zonePowerReq), [dps, zonePowerReq]);
  const progressionHint = useMemo(() => getProgressionHint(dps, zonePowerReq), [dps, zonePowerReq]);

  useEffect(() => {
    stateRef.current = state;
    scoreRef.current = score;
  }, [state, score]);

  // ── Floating damage numbers ────────────────────────────────────────────────
  const spawnDmg = useCallback((value: number, kind: DmgNumber["kind"]) => {
    const id = ++dmgIdRef.current;
    const x = 30 + Math.random() * 40;
    setDmgNums(prev => [...prev.slice(-10), { id, value, kind, x }]);
    setTimeout(() => setDmgNums(prev => prev.filter(n => n.id !== id)), 1600);
  }, []);

  const spawnFeelBurst = useCallback((kind: FeelBurst["kind"], text = "") => {
    const id = ++feelBurstIdRef.current;
    setFeelBursts(prev => [...prev.slice(-4), { id, kind }]);
    if (text) setRewardText(text);
    setTimeout(() => {
      setFeelBursts(prev => prev.filter(burst => burst.id !== id));
      if (text) setRewardText("");
    }, 950);
  }, []);

  useEffect(() => {
    const prev = prevHpRef.current;
    if (prev.stage === state.stage && state.enemyHp < prev.hp && prev.hp > 0) {
      const dmg = Math.round(prev.hp - state.enemyHp);
      if (dmg > 0) {
        const kind = isBoss ? "boss" : dps > 200 && Math.random() < 0.15 ? "crit" : "normal";
        spawnDmg(dmg, kind);
        spawnFeelBurst(kind === "crit" ? "crit" : "hit");
        if (kind === "crit") playCrit(); else playHit();
        if (!hitRef.current) {
          hitRef.current = true;
          setIsHit(true);
          setTimeout(() => { setIsHit(false); hitRef.current = false; }, 180);
        }
      }
    } else if (prev.stage !== state.stage) {
      spawnDmg(0, "kill"); // kill flash
      spawnFeelBurst("kill", `Stage ${state.stage} cleared`);
      playReward();
      // White flash + green stage-clear flash
      setIsKillFlash(true);
      setIsStageClear(true);
      setTimeout(() => setIsKillFlash(false), 500);
      setTimeout(() => setIsStageClear(false), 600);
    }
    prevHpRef.current = { hp: state.enemyHp, stage: state.stage };
  }, [state.enemyHp, state.stage, isBoss, dps, spawnDmg, spawnFeelBurst, playCrit, playHit, playReward]);

  useEffect(() => {
    if (state.level > prevLevelRef.current) {
      spawnFeelBurst("level", `Level ${state.level}!`);
      playLevelUp();
      setIsXpLevelup(true);
      setTimeout(() => setIsXpLevelup(false), 750);
    }
    prevLevelRef.current = state.level;
  }, [state.level, spawnFeelBurst, playLevelUp]);

  // ── Gold chip bump — bump animation when mesos increase noticeably ──────────
  useEffect(() => {
    const gained = state.mesos - prevMesosRef.current;
    prevMesosRef.current = state.mesos;
    if (gained >= 20 && !isGoldBumping) {
      setIsGoldBumping(true);
      if (goldBumpTimerRef.current) clearTimeout(goldBumpTimerRef.current);
      goldBumpTimerRef.current = setTimeout(() => setIsGoldBumping(false), 450);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mesos]);

  // ── Tutorial: detect first kill → WOW moment ─────────────────────────────
  useEffect(() => {
    const prev = prevLifetimeKillsRef.current;
    prevLifetimeKillsRef.current = state.lifetimeKills;
    if (prev === 0 && state.lifetimeKills >= 1 && isTutorialActive(tutorial)) {
      // Advance tutorial step
      setTutorial(t => advanceTutorialOnKill(t));
      // Trigger WOW overlay
      setWowMoment({
        emoji: "💀",
        text: "FIRST KILL!",
        sub: `+${formatNumber(state.mesos - 0)} Mesos · XP Bonus!`
      });
      // First loot drop visual
      setLootDropVisible(true);
      setTimeout(() => setLootDropVisible(false), 1400);
      setTimeout(() => setWowMoment(null), 2600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lifetimeKills]);

  // ── Tutorial: detect level 2 → second WOW moment ─────────────────────────
  useEffect(() => {
    const prev = prevTutorialLevelRef.current;
    prevTutorialLevelRef.current = state.level;
    if (prev < 2 && state.level >= 2 && isTutorialActive(tutorial)) {
      setWowMoment({ emoji: "⭐", text: "LEVEL UP!", sub: `You're level ${state.level} — keep going!` });
      setTimeout(() => setWowMoment(null), 2400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.level]);

  // ── Tutorial: check completion on every render ────────────────────────────
  useEffect(() => {
    if (tutorial.step !== "done") {
      const next = checkTutorialComplete(tutorial, state.level);
      if (next.step !== tutorial.step) setTutorial(next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.level, tutorial.firstKillDone, tutorial.firstUpgradeDone]);

  // ── Power spike: milestone level reached ─────────────────────────────────
  useEffect(() => {
    const prev = prevMilestoneLevelRef.current;
    prevMilestoneLevelRef.current = state.level;
    // Detect if we crossed one or more milestone levels
    for (let lv = prev + 1; lv <= state.level; lv++) {
      const m = getMilestoneAtLevel(lv);
      if (m) {
        setPowerSpike({
          icon: m.icon,
          label: m.label,
          description: m.description,
          isWow: m.isWow,
          sub: `Power: ${formatPowerRating(powerRating)}`
        });
        if (m.isWow) playLevelUp();
        setTimeout(() => setPowerSpike(null), m.isWow ? 3200 : 2400);
        break; // show one at a time; next will fire next render cycle
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.level]);

  // ── Power spike: boss killed → free upgrade + surge visual ───────────────
  useEffect(() => {
    const prev = prevBossKillsRef.current;
    prevBossKillsRef.current = state.lifetimeBossKills;
    if (state.lifetimeBossKills <= prev) return;

    // Apply free hero upgrade
    const result = claimBossKillFreeUpgrade(state);
    if (result.success) {
      setState(result.state);
      saveGameState(result.state);
    }

    // Show power surge overlay
    setPowerSpike({
      icon: "💥",
      label: "BOSS SURGE!",
      description: `+100% DPS for ${BOSS_SURGE_SECONDS}s${result.success ? ` · ${result.message.split(":")[1]?.trim() ?? "Free upgrade!"}` : ""}`,
      isWow: true
    });
    setTimeout(() => setPowerSpike(null), 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lifetimeBossKills]);

  // ── Boss fight: initialize on stage entry ─────────────────────────────────
  useEffect(() => {
    const wasBoss = prevIsBossRef.current;
    prevIsBossRef.current = isBoss;
    if (isBoss && !wasBoss && bossDefinition) {
      const fight = createBossFightState(bossDefinition.id, bossDefinition.enrageTimer);
      bossFightRef.current = fight;
      setBossPhase(1);
      setActiveMechanicId(null);
      setMechanicTimeLeft(0);
      setEnrageTimeLeft(bossDefinition.enrageTimer);
      setIsBossEnraged(false);
      setBossVoiceLine(bossDefinition.voiceLines.intro);
      bossDpsMultiplierRef.current = 1.0;
      setTimeout(() => setBossVoiceLine(null), 4500);
    }
    if (!isBoss) {
      bossFightRef.current = null;
      setActiveMechanicId(null);
      setIsBossEnraged(false);
      setBossVoiceLine(null);
      bossDpsMultiplierRef.current = 1.0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBoss]);

  // ── Boss fight: mechanic tick (every second while boss is active) ──────────
  useEffect(() => {
    if (!isBoss || !bossDefinition) return;
    const t = window.setInterval(() => {
      const fight = bossFightRef.current;
      if (!fight) return;
      const now = Date.now();
      const hpPct = getEnemyHpPercent(stateRef.current);
      const { fight: nextFight, triggered, phaseTransition } = tickBossFight(fight, bossDefinition, hpPct, now);
      bossFightRef.current = nextFight;

      setBossPhase(nextFight.currentPhase);
      setEnrageTimeLeft(nextFight.enrageSecondsLeft);
      setIsBossEnraged(nextFight.isEnraged);
      setActiveMechanicId(nextFight.activeMechanicId);
      setMechanicTimeLeft(getMechanicTimeLeft(nextFight, now));

      // Update DPS multiplier ref so next game tick picks it up
      bossDpsMultiplierRef.current = computeBossDpsMultiplier(
        bossDefinition, nextFight.activeMechanicId, nextFight.isEnraged
      );

      // Show voice lines
      if (phaseTransition) {
        setBossVoiceLine(phaseTransition.transitionLine);
        setTimeout(() => setBossVoiceLine(null), 4200);
      } else if (triggered && triggered.effect !== "aoe") {
        setBossVoiceLine(`${triggered.icon} ${triggered.name}!`);
        setTimeout(() => setBossVoiceLine(null), 3200);
      } else if (nextFight.isEnraged && !fight.isEnraged) {
        setBossVoiceLine(bossDefinition.voiceLines.enrage);
        setTimeout(() => setBossVoiceLine(null), 4500);
      }
    }, 1000);
    return () => window.clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBoss, bossDefinition]);

  // ── Database loader ────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const nextMaps = await fetchDatabase<DatabaseMap>("/api/maps");
        if (!alive) return;
        const gameMaps = nextMaps.slice(0, MAX_GAME_MAPS);
        setMaps(gameMaps);
        setState(cur => gameMaps.some(m => m.id === cur.zone) ? cur : { ...cur, zone: gameMaps[0]?.id ?? cur.zone });
        const nextMonsters = await fetchDatabase<DatabaseMonster>("/api/monsters");
        if (!alive) return;
        setMonsters(limitMonsters(nextMonsters));
        const nextItems = await fetchDatabase<DatabaseItem>("/api/items");
        if (!alive) return;
        setItems(limitItems(nextItems));
        setToast(`${zone.name} — ready to adventure!`);
      } catch {
        if (alive) setToast("Offline mode — zone data loaded from cache.");
      }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Offline gains ──────────────────────────────────────────────────────────
  useEffect(() => {
    setState(cur => {
      const z = getFullZoneOrFirst(cur.zone);
      const m = getCurrentMonster(cur, z, monsters);
      const l = getFeaturedLoot(m, items);
      const next = calculateOfflineGains(cur, { zone: z, monster: m, lootCount: l.length });
      saveGameState(next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tick loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void loadIdleCloudSave(user.id).then((cloudSave) => {
      if (!alive || !cloudSave?.state) return;
      setState((cur) => {
        const shouldUseCloud = (cloudSave.state.lastSavedAt ?? 0) > (cur.lastSavedAt ?? 0);
        const next = shouldUseCloud ? cloudSave.state : cur;
        if (shouldUseCloud) {
          saveGameState(next);
          setOnlineStatus("Cloud save loaded");
        }
        return next;
      });
    });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const syncOnline = () => {
      const snapshot = stateRef.current;
      const currentScore = scoreRef.current;
      void saveIdleCloudSave(user.id, snapshot, currentScore).then((ok) => {
        setOnlineStatus(ok ? "Cloud save synced" : "Cloud save queued locally");
      });
      void submitIdleLeaderboard(user.id, user.username, currentScore);
    };
    syncOnline();
    const timer = window.setInterval(syncOnline, 10000);
    return () => window.clearInterval(timer);
  }, [user?.id, user?.username]);

  useEffect(() => {
    let alive = true;
    const refreshOnline = () => {
      void fetchGuilds().then((nextGuilds) => {
        if (alive) setGuilds(nextGuilds);
      });
      void fetchGlobalChat().then((messages) => {
        if (alive) setChatMessages(messages);
      });
    };
    refreshOnline();
    const timer = window.setInterval(refreshOnline, 8000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setState(cur => {
        const z = getFullZoneOrFirst(cur.zone);
        const m = getCurrentMonster(cur, z, monsters);
        const l = getFeaturedLoot(m, items);
        const next = gameTick(cur, 1, { zone: z, monster: m, lootCount: l.length, bossDpsMultiplier: bossDpsMultiplierRef.current });
        saveGameState(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [items, monsters]);

  // ── Dispatcher ────────────────────────────────────────────────────────────
  function dispatch(result: { state: IdleGameState; message: string; success: boolean }) {
    const stamped = { ...result.state, lastSavedAt: Date.now() };
    setState(stamped);
    saveGameState(stamped);
    setToast(result.message);
    if (result.success) {
      playSuccess();
      // Advance tutorial on any successful purchase
      setTutorial(t => advanceTutorialOnUpgrade(t));
    } else {
      playFailure();
    }
  }

  // ── Tutorial-aware tab setter ─────────────────────────────────────────────
  function handleTabChange(newTab: TabId) {
    setTab(newTab);
    setTutorial(t => advanceTutorialOnTabOpen(t, newTab));
  }

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleHunt = () => dispatch(huntBurst(state, { zone, monster: currentMonster, lootCount: featuredLoot.length }));

  const handleBuyHero = (id: keyof typeof HEROES) => dispatch(buyHero(state, id, HEROES[id].name, getHeroCost(id, state.heroLevels[id])));
  const handleBuyUpgrade = (id: keyof typeof UPGRADES) => dispatch(buyUpgrade(state, id, UPGRADES[id].name, getUpgradeCost(id, state.upgrades[id])));
  const handleBuyGear = (id: keyof typeof GEAR) => dispatch(buyGear(state, id, GEAR[id].name, getGearCost(id, state.gearLevels[id])));
  const handleEquipLoot = (itemId: string) => dispatch(equipLootItem(state, itemId));
  const handleUnequipLoot = (type: IdleItemType) => dispatch(unequipLootItem(state, type));
  const handleAutoEquipLoot = () => dispatch(autoEquipBestLoot(state));
  const handleTrainSkill = (id: keyof typeof SKILLS) => dispatch(trainSkill(state, id, SKILLS[id].name, getSkillCost(id, state.skillLevels[id])));
  const handleBuyGlobalMult = (id: GlobalMultId) => dispatch(buyGlobalMult(state, id));
  const handleUpgradeRelic = (id: RelicUpgradeId) => dispatch(upgradeRelic(state, id));
  const handleBuyTalent    = (id: TalentNodeId) => dispatch(buyTalent(state, id));
  const handleSelectClass = (id: ClassId) => dispatch(selectClass(state, id));
  const handleActivateSkill = (id: ClassSkillId) => dispatch(activateClassSkill(state, id, dps));
  const handleChangeZone = (z: WorldZone) => dispatch(changeZone(state, z));
  const handleClaimDailyReward = () => dispatch(claimDailyReward(state));
  const handleClaimMissionReward = (id: MissionId) => dispatch(claimMissionReward(state, id));
  const handleReadNotifications = () => dispatch(markNotificationsRead(state));
  const handleCreateGuild = () => {
    if (!user) return openAuth();
    void createGuild(user.id, user.username, guildName).then((guild) => {
      if (!guild) return;
      setGuilds((cur) => cur.some((entry) => entry.id === guild.id) ? cur : [guild, ...cur]);
      setOnlineStatus(`Guild ${guild.name} ready`);
    });
  };
  const handleJoinGuild = (guildId: string) => {
    if (!user) return openAuth();
    void joinGuild(user.id, user.username, guildId).then((guild) => {
      if (!guild) return;
      setGuilds((cur) => cur.map((entry) => entry.id === guild.id ? guild : entry));
      setOnlineStatus(`Joined ${guild.name}`);
    });
  };
  const handleSendChat = () => {
    if (!user) return openAuth();
    const message = chatInput.trim();
    if (!message) return;
    setChatInput("");
    void sendGlobalChat(user.id, user.username, message).then((ok) => {
      if (!ok) return;
      void fetchGlobalChat().then(setChatMessages);
    });
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
  const enemyName = currentMonster?.name ?? stageEnemy?.name ?? "Monster";
  const monsterIdentity = currentMonster as (DatabaseMonster & Partial<{
    elementalType: string;
    specialTrait: string;
    roleIdentity: string;
    title: string;
    variantLabel: string;
  }>) | null;
  const mapLocationName = mapBg?.locationName ?? zone.name;
  const mapFlavor = zone.flavorText || zone.description || visualIdentity.atmosphere;
  const arenaFxClass = [
    isBoss ? "is-boss-fx" : "",
    isElite ? "is-elite-fx" : "",
    isHit ? "is-hit-fx" : "",
    isKillFlash ? "is-kill-fx" : "",
    isStageClear ? "is-clear-fx" : "",
    lootDropVisible ? "is-loot-fx" : "",
    surgeActive ? "is-surge-fx" : "",
  ].filter(Boolean).join(" ");

  return (
    <GameShell
      title="IdleStory World"
      subtitle={`${zone.region} · Lv.${state.level}`}
      icon="⚔"
      aspectRatio="9 / 16"
    >
      <div className="isw">

        {/* ════ TOP HUD ════ */}
        <div className="isw-hud">
          <div className="isw-hud__player">
            <div className="isw-hud__avatar">IW</div>
            <div className="isw-hud__player-copy">
              <strong>IdleStory World</strong>
              <span>{zone.name} · Wave {state.stage}</span>
            </div>
            <button className="isw-hud__menu" type="button" aria-label="Game menu">☰</button>
          </div>
          <div className="isw-hud__currencies">
            <div className={`isw-hud__chip isw-hud__chip--gold${incomeRates.isCapped ? " isw-hud__chip--capped" : ""}${isGoldBumping ? " is-bumping" : ""}`}>
              <span className="isw-hud__chip-icon">💰</span>
              <span className="isw-hud__chip-val">{formatNumber(state.mesos)}</span>
            </div>
            <div className={`isw-hud__chip isw-hud__chip--crystal${state.crystals >= 500 ? " isw-hud__chip--capped" : ""}`}>
              <span className="isw-hud__chip-icon">💎</span>
              <span className="isw-hud__chip-val">{Math.floor(state.crystals)}/500</span>
            </div>
            <div className="isw-hud__chip isw-hud__chip--relic">
              <span className="isw-hud__chip-icon">🔮</span>
              <span className="isw-hud__chip-val">{formatNumber(state.relics)}</span>
            </div>
            <div className="isw-hud__chip isw-hud__chip--fame">
              <span className="isw-hud__chip-icon">🏆</span>
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
              ⚡ {formatNumber(dps)}/s
              {surgeActive && <span className="isw-hud__surge-tag">SURGE</span>}
            </span>
            <span
              className="isw-hud__power"
              style={{ color: powerTier.color }}
              title={`${powerTier.label} rank`}
            >
              ✦ {formatPowerRating(powerRating)}
            </span>
          </div>
        </div>

        {/* ════ COMBAT ARENA ════ */}
        <div className={[
          "isw-arena",
          arenaFxClass,
          `is-theme-${zone.theme}`,
          isBossEnraged ? "is-enraged" : "",
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
                  {n.kind === "crit" ? "✦ " : ""}{formatNumber(n.value)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <AnimatePresence>
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

          {/* Stage badge */}
          <div className="isw-arena__stage">
            <span className={`isw-arena__stage-badge${isBoss ? " is-boss" : isElite ? " is-elite" : ""}`}>
              {isBoss
                ? `⚠ BOSS · Stage ${state.stage}`
                : isElite
                  ? `⚡ ELITE · Stage ${state.stage}`
                  : `Stage ${state.stage} · ${zone.name}`}
            </span>
            <span className="isw-arena__location-tag">{mapLocationName}</span>
            {/* Power gate warning pill */}
            {(powerStatus === "underpowered" || powerStatus === "blocked") && !isBoss && (
              <span className={`isw-power-pill isw-power-pill--${powerStatus}`}>
                {powerStatus === "blocked" ? "🚫 Blocked" : "⚠ Slowed"} {Math.round(progMult * 100)}%
              </span>
            )}
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
                {currentMonster?.image
                  ? <img src={currentMonster.image} alt={enemyName} />
                  : <span className="isw-arena__emoji" role="img" aria-label={enemyName}>
                      {currentMonster?.portrait ?? stageEnemy?.portrait ?? "👾"}
                    </span>
                }
              </motion.div>
            </div>
          )}

          {/* Enemy info — hidden during boss fights (BossPanel has its own HP bar) */}
          {!isBoss && (
            <div className="isw-arena__enemy-info">
              <div className="isw-arena__enemy-name">
                {enemyName}
                {state.prestigeCount > 0 && (
                  <span className="isw-prestige-badge" style={{ marginLeft: 6 }}>×{state.prestigeCount}</span>
                )}
              </div>
              <div className="isw-arena__enemy-hint">
                <span>{monsterIdentity?.roleIdentity ?? monsterIdentity?.specialTrait ?? visualIdentity.monsterCue}</span>
                {monsterIdentity?.elementalType && <span>{monsterIdentity.elementalType}</span>}
              </div>
              <div className="isw-arena__hp-label">
                <span>HP</span>
                <span>{formatNumber(state.enemyHp)} / {formatNumber(state.enemyMaxHp)}</span>
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
          <div className="isw-toast">{toast}</div>

          {/* Boss surge active indicator */}
          {surgeActive && !isBoss && (
            <div className="isw-surge-badge">
              <span className="isw-surge-badge__icon">💥</span>
              <span className="isw-surge-badge__text">SURGE ×2</span>
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
                💎 Lucky Drop!
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ position: "absolute", inset: 0, zIndex: 10 }}
              >
                <BossPanel
                  zone={zone}
                  monster={currentMonster}
                  hpPct={enemyHpPct}
                  enemyHp={state.enemyHp}
                  enemyMaxHp={state.enemyMaxHp}
                  stage={state.stage}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ════ TUTORIAL HINT BAR ════ */}
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
                {tutorialStep === "intro" ? "⚔" : tutorialStep === "heroes_tab" ? "🛡" : tutorialStep === "buy_hero" ? "💰" : "🎉"}
              </span>
              <div className="isw-tutorial-hint__body">
                <span className="isw-tutorial-hint__text">{tutorialHint.text}</span>
                <span className="isw-tutorial-hint__sub">{tutorialHint.sub}</span>
              </div>
              {tutorialHint.target === "heroes_tab" && (
                <span className="isw-tutorial-hint__arrow">↓ Heroes</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════ BOTTOM TABS ════ */}
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
                    onClaimMission={handleClaimMissionReward}
                    onReadNotifications={handleReadNotifications}
                    powerRating={powerRating}
                    powerTier={powerTier}
                    nextMilestone={nextMilestone}
                    surgeSecondsLeft={state.bossSurgeSecondsLeft}
                    dps={dps}
                  />
                )}
                {tab === "heroes" && (
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
                )}
                {tab === "inventory" && (
                  <InventoryPanel
                    state={state}
                    items={items}
                    onBuyGear={handleBuyGear}
                    onBestGear={() => dispatch(buyBestGear(state))}
                    onEquipLoot={handleEquipLoot}
                    onUnequipLoot={handleUnequipLoot}
                    onAutoEquipLoot={handleAutoEquipLoot}
                  />
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
                {tab === "zones" && (
                  <ZoneTab
                    state={state}
                    progress={zoneProgress}
                    onChangeZone={handleChangeZone}
                    setToast={setToast}
                  />
                )}
                {tab === "talents" && (
                  <TalentTreePanel
                    state={state}
                    onBuyTalent={handleBuyTalent}
                  />
                )}
                {tab === "online" && (
                  <OnlineTab
                    user={user}
                    status={onlineStatus}
                    guilds={guilds}
                    guildName={guildName}
                    chatMessages={chatMessages}
                    chatInput={chatInput}
                    onLogin={openAuth}
                    onGuildNameChange={setGuildName}
                    onCreateGuild={handleCreateGuild}
                    onJoinGuild={handleJoinGuild}
                    onChatInputChange={setChatInput}
                    onSendChat={handleSendChat}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Tab nav */}
          <nav className="isw-tab-nav">
            {([
              { id: "combat",    icon: "⚔️",  label: "Combat"    },
              { id: "heroes",    icon: "🛡️",  label: "Heroes"    },
              { id: "inventory", icon: "🎒",  label: "Bag"       },
              { id: "class",     icon: "✨",  label: "Class"     },
              { id: "economy",   icon: "💰",  label: "Economy"   },
              { id: "zones",     icon: "🗺️",  label: "Zones"     },
              { id: "talents",   icon: "🌟",  label: "Talents"   },
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
                {/* Tutorial arrow badge on Heroes tab */}
                {tutorialStep === "heroes_tab" && id === "heroes" && (
                  <span className="isw-tutorial-arrow-badge">↑</span>
                )}
              </motion.button>
            ))}
            <motion.button
              className={`isw-tab-nav__btn${tab === "online" ? " is-active" : ""}`}
              onClick={() => handleTabChange("online")}
              whileTap={{ scale: 0.88 }}
              type="button"
            >
              <span className="isw-tab-nav__btn-icon">🌐</span>
              Online
              {user && <span className="isw-tab-nav__badge" />}
            </motion.button>
          </nav>
        </div>

      </div>
    </GameShell>
  );
}

// ─── COMBAT TAB ───────────────────────────────────────────────────────────────

function OnlineTab({
  user,
  status,
  guilds,
  guildName,
  chatMessages,
  chatInput,
  onLogin,
  onGuildNameChange,
  onCreateGuild,
  onJoinGuild,
  onChatInputChange,
  onSendChat
}: {
  user: { id: string; username: string } | null;
  status: string;
  guilds: Guild[];
  guildName: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  onLogin: () => void;
  onGuildNameChange: (value: string) => void;
  onCreateGuild: () => void;
  onJoinGuild: (guildId: string) => void;
  onChatInputChange: (value: string) => void;
  onSendChat: () => void;
}) {
  return (
    <div className="isw-panel">
      <div className="isw-upgrade-section">
        <div className="isw-section-head">
          <span className="isw-section-label">Online Account</span>
          <span className="isw-section-sub">{status}</span>
        </div>
        <div className="isw-shop-grid">
          <div className="isw-shop-card">
            <span className="isw-shop-card__name">{user ? user.username : "Guest"}</span>
            <span className="isw-shop-card__desc">Cloud save, leaderboard, guilds and chat.</span>
            <button className="isw-mini-btn" type="button" onClick={onLogin} disabled={Boolean(user)}>
              {user ? "Connected" : "Login"}
            </button>
          </div>
        </div>
      </div>

      <div className="isw-upgrade-section">
        <div className="isw-section-head">
          <span className="isw-section-label">Guilds</span>
          <span className="isw-section-sub">{guilds.length} active</span>
        </div>
        <div className="isw-online-row">
          <input value={guildName} onChange={(event) => onGuildNameChange(event.target.value)} placeholder="Guild name" />
          <button className="isw-action-btn" type="button" onClick={onCreateGuild}>Create</button>
        </div>
        <div className="isw-shop-grid">
          {guilds.slice(0, 4).map((guild) => (
            <div className="isw-shop-card" key={guild.id}>
              <span className="isw-shop-card__name">{guild.name}</span>
              <span className="isw-shop-card__desc">{guild.members.length} members</span>
              <button className="isw-mini-btn" type="button" onClick={() => onJoinGuild(guild.id)}>Join</button>
            </div>
          ))}
        </div>
      </div>

      <div className="isw-upgrade-section">
        <div className="isw-section-head">
          <span className="isw-section-label">Global Chat</span>
          <span className="isw-section-sub">Live room</span>
        </div>
        <div className="isw-online-chat">
          {chatMessages.slice(-6).map((entry) => (
            <div className="isw-online-chat__msg" key={entry.id}>
              <strong>{entry.username}</strong>
              <span>{entry.message}</span>
            </div>
          ))}
        </div>
        <div className="isw-online-row">
          <input
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSendChat();
            }}
            placeholder="Write to global chat"
          />
          <button className="isw-action-btn" type="button" onClick={onSendChat}>Send</button>
        </div>
      </div>
    </div>
  );
}

function CombatTab({
  state, isBoss, currentMonster, rebirthPreview,
  retentionSummary,
  onHunt, onRaid, onPrestige, onRebirth,
  onClaimDaily, onClaimMission, onReadNotifications,
  powerRating, powerTier, nextMilestone, surgeSecondsLeft, dps
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
  onClaimMission: (id: MissionId) => void;
  onReadNotifications: () => void;
  powerRating: number;
  powerTier: ReturnType<typeof getPowerTier>;
  nextMilestone: MilestoneBonus | null;
  surgeSecondsLeft: number;
  dps: number;
}) {
  const dailyClaimed = !retentionSummary.dailyAvailable;
  const unreadCount = retentionSummary.unreadNotifications;
  const completedAchievements = retentionSummary.completedAchievements;
  const aiRecommendation = state.ai.upgradeRecommendations[0];
  const surgeActive = surgeSecondsLeft > 0;

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
            <span>⚡ DPS</span>
            <strong>{formatNumber(dps)}</strong>
          </div>
          <div className="isw-power-card__stat">
            <span>📈 Level</span>
            <strong>{state.level}</strong>
          </div>
          <div className="isw-power-card__stat">
            <span>⭐ Prestige</span>
            <strong>{state.prestigeCount > 0 ? `×${state.prestigeCount}` : "—"}</strong>
          </div>
        </div>
        {/* Boss surge active bar */}
        {surgeActive && (
          <div className="isw-power-card__surge">
            <span className="isw-power-card__surge-label">💥 BOSS SURGE  ×2 DPS</span>
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
              {nextMilestone.icon} Lv.{nextMilestone.level} — {nextMilestone.label}
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
          whileTap={{ scale: 0.96 }}
          type="button"
        >
          ⚔️ Hunt {currentMonster?.portrait ?? "🐾"}
        </motion.button>
        <motion.button
          className={`isw-action-btn${isBoss ? " is-boss-btn" : ""}`}
          onClick={onRaid}
          whileTap={{ scale: 0.94 }}
          type="button"
        >
          {isBoss ? "💥 Boss Strike" : "🎯 Raid Boss"}
        </motion.button>
        <motion.button
          className={`isw-action-btn${rebirthPreview.canPrestige ? " is-ready" : ""}`}
          onClick={onPrestige}
          whileTap={{ scale: 0.94 }}
          type="button"
          title={rebirthPreview.prestigeReason}
        >
          ⭐ Prestige
          {rebirthPreview.canPrestige ? " ✓" : ` (${Math.floor(state.crystals)}/8)`}
        </motion.button>
        <motion.button
          className={`isw-action-btn${rebirthPreview.canRebirth ? " is-ready" : ""}`}
          onClick={onRebirth}
          whileTap={{ scale: 0.94 }}
          type="button"
          title={rebirthPreview.rebirthReason}
        >
          🌀 Rebirth
          {rebirthPreview.canRebirth ? ` +${rebirthPreview.relicsOnRebirth}🔮` : ""}
        </motion.button>
      </div>

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
                ? `${aiRecommendation.label} · ${formatNumber(aiRecommendation.cost)} ${aiRecommendation.currency}`
                : "Watching run"}
            </span>
          </div>
          <div className="isw-shop-card">
            <span className="isw-shop-card__name">Player behavior</span>
            <span className="isw-shop-card__desc">
              {state.behavior.totalActions} actions · {Math.floor(state.behavior.idleSeconds)}s idle
            </span>
            <span className="isw-shop-card__cost">Difficulty ×{state.ai.adaptiveDifficulty.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="isw-upgrade-section">
        <div className="isw-section-head">
          <span className="isw-section-label">Retention</span>
          <span className="isw-section-sub">{completedAchievements}/{retentionSummary.totalAchievements} achievements</span>
        </div>
        <div className="isw-shop-grid">
          <button
            type="button"
            className={`isw-shop-card${dailyClaimed ? " is-owned" : ""}`}
            onClick={onClaimDaily}
            disabled={dailyClaimed}
          >
            <span className="isw-shop-card__name">Daily Reward</span>
            <span className="isw-shop-card__desc">Streak {state.dailyReward.streak} · Best {state.dailyReward.bestStreak}</span>
            <span className="isw-shop-card__cost">{dailyClaimed ? "Claimed" : "Claim"}</span>
          </button>

          {(Object.keys(MISSION_DEFINITIONS) as MissionId[]).map((id) => {
            const mission = state.missions[id];
            const definition = MISSION_DEFINITIONS[id];
            const canClaim = mission.completed && !mission.claimed;
            return (
              <button
                key={id}
                type="button"
                className={`isw-shop-card${mission.claimed ? " is-owned" : ""}${canClaim ? " is-ready" : ""}`}
                onClick={() => onClaimMission(id)}
                disabled={!canClaim}
              >
                <span className="isw-shop-card__name">{definition.label}</span>
                <span className="isw-shop-card__desc">{mission.progress}/{definition.target}</span>
                <span className="isw-shop-card__cost">{mission.claimed ? "Claimed" : canClaim ? "Claim" : "Active"}</span>
              </button>
            );
          })}

          <button
            type="button"
            className={`isw-shop-card${unreadCount ? " is-ready" : ""}`}
            onClick={onReadNotifications}
            disabled={!unreadCount}
          >
            <span className="isw-shop-card__name">Notifications</span>
            <span className="isw-shop-card__desc">Future-ready event inbox</span>
            <span className="isw-shop-card__cost">{unreadCount} unread</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CLASS PICK TAB ───────────────────────────────────────────────────────────

function ClassPickTab({ onSelect }: { onSelect: (id: ClassId) => void }) {
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

function ClassTab({
  state, skills, maxResource, resourcePct, regenMult, level, onActivate, onSwitch
}: {
  state: IdleGameState;
  skills: ClassSkillDefinition[];
  maxResource: number;
  resourcePct: number;
  regenMult: number;
  level: number;
  onActivate: (id: ClassSkillId) => void;
  onSwitch: (id: ClassId) => void;
}) {
  if (!state.classId) return null;
  const cls = CLASSES[state.classId];
  const resName = cls.resource === "mana" ? "Mana" : "Rage";
  const maxHp = getClassMaxHp(state.classId, level);

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
            {regenMult > 1 && <span>Regen ×{regenMult.toFixed(1)}</span>}
          </div>
          <div className="isw-resource-bar">
            <div
              className={`isw-resource-fill isw-resource-fill--${cls.resource}`}
              style={{ width: `${resourcePct}%` }}
            />
          </div>
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
                  {SKILL_DEFINITIONS[buff.skillId]?.icon ?? "✨"}{" "}
                  {SKILL_DEFINITIONS[buff.skillId]?.name ?? buff.skillId}{" "}
                  {buff.effectType === "buff_crit"
                    ? `×${buff.charges}`
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
            const canAfford = state.resource >= skill.resourceCost;
            const isReady = !locked && !onCd && canAfford;
            const cdPct = onCd ? (1 - cd / SKILL_DEFINITIONS[skill.id].cooldown) * 100 : 0;
            const resName2 = state.classId === "mage" ? "mana" : "rage";
            const status = locked
              ? `Lv.${skill.unlockLevel}`
              : onCd ? `${Math.ceil(cd)}s`
              : !canAfford ? `${skill.resourceCost} ${resName2}`
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

function EconomyTab({
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
              {formatNumber(incomePerSec)}/s{isCapped ? " ⚠" : ""}
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
            <span style={{ fontSize: 10, color: "var(--crystal)" }}>💎 Crystals</span>
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
                    {maxed ? "Max" : `${formatNumber(cost)} 💎`}
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
            <span style={{ fontSize: 10, color: "var(--relic)" }}>🔮 Permanent</span>
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
                    {maxed ? "Max" : `${cost} 🔮`}
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
              <div className="isw-rebirth-row__title">⭐ Prestige ×{state.prestigeCount + 1}</div>
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
              <div className="isw-rebirth-row__title">🌀 Rebirth ×{state.rebirthCount + 1}</div>
              <div className="isw-rebirth-row__reason">{preview.rebirthReason}</div>
              <div className="isw-rebirth-row__hint">Resets everything — relics are permanent</div>
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

function ZoneTab({
  state, progress, onChangeZone, setToast
}: {
  state: IdleGameState;
  progress: ReturnType<typeof getZoneProgressSummary>;
  onChangeZone: (z: WorldZone) => void;
  setToast: (msg: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleZones = showAll ? ALL_ZONES : ALL_ZONES.slice(0, 8);

  return (
    <div className="isw-panel">
      <div className="isw-zones">
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
            {progress.levelsToNext > 0 ? ` — ${progress.levelsToNext} levels away` : ""}
            {progress.prestigesToNext > 0 ? ` — Prestige ×${progress.nextLocked.prestigeRequired}` : ""}
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
                      setToast(`🔒 ${locked ? status.reason : z.name}`);
                    } else {
                      onChangeZone(z);
                    }
                  }}
                  whileTap={!locked ? { scale: 0.97 } : {}}
                  aria-disabled={locked}
                >
                  <span className="isw-zone-btn__icon">{locked ? "🔒" : (isActive ? z.bossIcon : "🗺️")}</span>
                  <div className="isw-zone-btn__info">
                    <div className="isw-zone-btn__name">{z.name}</div>
                    {locked
                      ? <div className="isw-zone-btn__lock-reason">{status.reason}</div>
                      : <div className="isw-zone-btn__meta">{z.region} · {z.description.slice(0, 40)}</div>
                    }
                  </div>
                  {!locked && (
                    <span className="isw-zone-btn__boost">×{z.rewardBoost.toFixed(1)}</span>
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
          {showAll ? `▲ Show less` : `▼ Show all ${ALL_ZONES.length} zones`}
        </button>
      </div>
    </div>
  );
}

// ─── Re-exports ───────────────────────────────────────────────────────────────
export type { IdleGameState, WorldZone, DatabaseMap, DatabaseMonster, DatabaseItem } from "./idlestory/gameEngine";
export { DEFAULT_STATE } from "./idlestory/gameEngine";
