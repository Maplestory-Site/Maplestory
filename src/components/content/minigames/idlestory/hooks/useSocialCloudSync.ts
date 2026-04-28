import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  createShadowSnapshot,
  saveGameState,
  syncGuildState,
  updateSocialRanks,
  type IdleGameState,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type ShadowSnapshot,
  type WeeklyRankingEntry
} from "../gameEngine";
import { calculateDPS } from "../progressionSystem";
import { calculatePowerRating } from "../powerSpikeSystem";
import {
  fetchIdleSocialSnapshot,
  loadIdleCloudSave,
  saveIdleCloudSave,
  submitIdleLeaderboard,
  syncIdleSocialProfile,
  type SocialGuild
} from "../onlineIdleService";
import { useManagedTimers } from "./useManagedTimers";

type SocialUser = {
  id: string;
  username: string;
} | null;

type SocialIdentity = {
  id: string;
  username: string;
};

type UseSocialCloudSyncParams = {
  user: SocialUser;
  socialIdentity: SocialIdentity;
  state: IdleGameState;
  score: number;
  setState: Dispatch<SetStateAction<IdleGameState>>;
};

export function useSocialCloudSync({
  user,
  socialIdentity,
  state,
  score,
  setState
}: UseSocialCloudSyncParams) {
  const [guildName, setGuildName] = useState("Snail Legends");
  const [socialGuilds, setSocialGuilds] = useState<SocialGuild[]>([]);
  const [currentGuild, setCurrentGuild] = useState<SocialGuild | null>(null);
  const [leaderboards, setLeaderboards] = useState<Partial<Record<LeaderboardCategory, LeaderboardEntry[]>>>({});
  const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>("power");
  const [weeklyRanking, setWeeklyRanking] = useState<WeeklyRankingEntry[]>([]);
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);
  const [shadowOpponents, setShadowOpponents] = useState<ShadowSnapshot[]>([]);
  const [socialStatus, setSocialStatus] = useState("Social cache active");

  const stateRef = useRef(state);
  const scoreRef = useRef(score);
  const cloudLoadRequestIdRef = useRef(0);
  const cloudSyncRequestIdRef = useRef(0);
  const cloudSyncInFlightRef = useRef(false);
  const socialSyncRequestIdRef = useRef(0);
  const socialSyncInFlightRef = useRef(false);
  const lastStatusRef = useRef("Social cache active");
  const lastStatusAtRef = useRef(0);
  const cloudFailureStreakRef = useRef(0);
  const socialFailureStreakRef = useRef(0);

  const { isMountedRef, setManagedInterval, clearManagedInterval } = useManagedTimers();

  const updateSocialStatus = (nextStatus: string, options?: { force?: boolean }) => {
    const force = options?.force === true;
    const now = Date.now();
    const statusChanged = lastStatusRef.current !== nextStatus;
    const shouldThrottle = !force && !statusChanged && now - lastStatusAtRef.current < 15000;
    if (shouldThrottle) return;
    lastStatusRef.current = nextStatus;
    lastStatusAtRef.current = now;
    setSocialStatus(nextStatus);
  };

  useEffect(() => {
    stateRef.current = state;
    scoreRef.current = score;
  }, [state, score]);

  useEffect(() => {
    if (!user) return;

    const requestId = ++cloudLoadRequestIdRef.current;
    void loadIdleCloudSave(user.id)
      .then((cloudSave) => {
        if (!isMountedRef.current || requestId !== cloudLoadRequestIdRef.current || !cloudSave?.state) return;
        setState((cur) => {
          const shouldUseCloud = (cloudSave.state.lastSavedAt ?? 0) > (cur.lastSavedAt ?? 0);
          const next = shouldUseCloud ? cloudSave.state : cur;
          if (shouldUseCloud) {
            saveGameState(next);
            updateSocialStatus("Cloud save loaded");
          }
          return next;
        });
      })
      .catch(() => {
        if (!isMountedRef.current || requestId !== cloudLoadRequestIdRef.current) return;
        updateSocialStatus("Cloud save queued locally");
      });

    return () => {
      if (cloudLoadRequestIdRef.current === requestId) {
        cloudLoadRequestIdRef.current += 1;
      }
    };
  }, [user, setState, isMountedRef]);

  useEffect(() => {
    if (!user) return;

    const syncOnline = () => {
      if (cloudSyncInFlightRef.current) return;

      const requestId = ++cloudSyncRequestIdRef.current;
      cloudSyncInFlightRef.current = true;
      const snapshot = stateRef.current;
      const currentScore = scoreRef.current;

      void saveIdleCloudSave(user.id, snapshot, currentScore)
        .then((ok) => {
          if (!isMountedRef.current || requestId !== cloudSyncRequestIdRef.current) return;
          if (ok) {
            cloudFailureStreakRef.current = 0;
            updateSocialStatus("Cloud save synced");
          } else {
            cloudFailureStreakRef.current += 1;
            if (cloudFailureStreakRef.current === 1 || cloudFailureStreakRef.current % 4 === 0) {
              updateSocialStatus("Cloud save queued locally");
            }
          }
        })
        .catch(() => {
          if (!isMountedRef.current || requestId !== cloudSyncRequestIdRef.current) return;
          cloudFailureStreakRef.current += 1;
          if (cloudFailureStreakRef.current === 1 || cloudFailureStreakRef.current % 4 === 0) {
            updateSocialStatus("Cloud save queued locally");
          }
        })
        .finally(() => {
          if (requestId === cloudSyncRequestIdRef.current) {
            cloudSyncInFlightRef.current = false;
          }
        });

      void submitIdleLeaderboard(user.id, user.username, currentScore);
    };

    syncOnline();
    const timer = setManagedInterval(syncOnline, 10000);

    return () => {
      clearManagedInterval(timer);
      cloudSyncRequestIdRef.current += 1;
      cloudSyncInFlightRef.current = false;
    };
  }, [user, isMountedRef, setManagedInterval, clearManagedInterval]);

  useEffect(() => {
    const syncSocial = async () => {
      if (socialSyncInFlightRef.current) return;

      const requestId = ++socialSyncRequestIdRef.current;
      socialSyncInFlightRef.current = true;

      try {
        const snapshot = stateRef.current;
        const liveDps = calculateDPS(snapshot);
        const livePower = calculatePowerRating(liveDps, snapshot.level, snapshot.prestigeCount);
        const shadow = createShadowSnapshot(snapshot, livePower, liveDps, socialIdentity.username, socialIdentity.id);

        const synced = await syncIdleSocialProfile(socialIdentity.id, socialIdentity.username, {
          level: snapshot.level,
          power: livePower,
          stage: snapshot.stage,
          bossKills: snapshot.lifetimeBossKills,
          goldEarned: snapshot.totalGoldEarned,
          weeklyStage: snapshot.weeklyRankingState?.stageProgress ?? snapshot.stage,
          weeklyBossClears: snapshot.weeklyRankingState?.bossClears ?? 0,
          guildId: snapshot.guildState.guildId,
          guildName: snapshot.guildState.guildName,
          pvp: {
            rating: snapshot.pvpState.rating,
            wins: snapshot.pvpState.wins,
            losses: snapshot.pvpState.losses
          },
          shadow: {
            dps: shadow.dps,
            hp: shadow.hp,
            defense: shadow.defense,
            attackSpeed: shadow.attackSpeed,
            critChance: shadow.critChance,
            critDamage: shadow.critDamage
          }
        });

        if (!isMountedRef.current || requestId !== socialSyncRequestIdRef.current) return;

        const social = await fetchIdleSocialSnapshot(socialIdentity.id);
        if (!isMountedRef.current || requestId !== socialSyncRequestIdRef.current) return;

        if (!social) {
          if (synced) {
            socialFailureStreakRef.current = 0;
            updateSocialStatus("Social synced");
          } else {
            socialFailureStreakRef.current += 1;
            if (socialFailureStreakRef.current === 1 || socialFailureStreakRef.current % 3 === 0) {
              updateSocialStatus("Social cache active");
            }
          }
          return;
        }

        setSocialGuilds(social.guilds);
        setCurrentGuild(social.currentGuild);
        setLeaderboards(social.leaderboards);
        setWeeklyRanking(social.weeklyRanking);
        setWeeklyRank(social.weeklyRank);
        setShadowOpponents(social.shadowOpponents);
        if (synced) {
          socialFailureStreakRef.current = 0;
          updateSocialStatus("Social synced");
        } else {
          socialFailureStreakRef.current += 1;
          if (socialFailureStreakRef.current === 1 || socialFailureStreakRef.current % 3 === 0) {
            updateSocialStatus("Social cache active");
          }
        }

        let nextState: IdleGameState | null = null;
        setState((cur) => {
          const ranked = updateSocialRanks(
            cur,
            Object.fromEntries(
              Object.entries(social.currentRanks).filter(([, value]) => typeof value === "number")
            ) as Partial<Record<LeaderboardCategory, number>>,
            social.weeklyRank
          );

          const syncedGuild = social.currentGuild
            ? syncGuildState(ranked.guildState, {
                guildId: social.currentGuild.id,
                guildName: social.currentGuild.name,
                guildIcon: social.currentGuild.icon,
                guildXp: social.currentGuild.xp,
                guildLevel: social.currentGuild.level,
                memberCount: social.currentGuild.members.length
              })
            : syncGuildState(ranked.guildState, null);

          nextState = { ...ranked, guildState: syncedGuild };
          return nextState;
        });

        if (nextState) saveGameState(nextState);
      } catch {
        if (!isMountedRef.current || requestId !== socialSyncRequestIdRef.current) return;
        socialFailureStreakRef.current += 1;
        if (socialFailureStreakRef.current === 1 || socialFailureStreakRef.current % 3 === 0) {
          updateSocialStatus("Social cache active");
        }
      } finally {
        if (requestId === socialSyncRequestIdRef.current) {
          socialSyncInFlightRef.current = false;
        }
      }
    };

    void syncSocial();
    const timer = setManagedInterval(() => {
      void syncSocial();
    }, 12000);

    return () => {
      clearManagedInterval(timer);
      socialSyncRequestIdRef.current += 1;
      socialSyncInFlightRef.current = false;
    };
  }, [
    socialIdentity.id,
    socialIdentity.username,
    setState,
    isMountedRef,
    setManagedInterval,
    clearManagedInterval
  ]);

  return {
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
    setWeeklyRanking,
    weeklyRank,
    setWeeklyRank,
    shadowOpponents,
    setShadowOpponents,
    socialStatus,
    setSocialStatus
  };
}
