import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  formatNumber,
  type GuildState,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type PvpState,
  type ShadowSnapshot,
  type WeeklyRankingEntry
} from "../gameEngine";
import type { SocialGuild } from "../onlineIdleService";

type SocialTab = "guild" | "leaderboard" | "pvp";

function SocialPanelInner({
  user,
  guildState,
  guilds,
  currentGuild,
  guildDraft,
  onGuildDraftChange,
  onLogin,
  onCreateGuild,
  onJoinGuild,
  onLeaveGuild,
  onRaidGuildBoss,
  leaderboards,
  leaderboardCategory,
  onLeaderboardCategoryChange,
  currentRanks,
  weeklyRanking,
  weeklyRank,
  canClaimWeeklyReward,
  onClaimWeeklyReward,
  pvpState,
  shadowOpponents,
  onShadowBattle,
  status
}: {
  user: { id: string; username: string } | null;
  guildState: GuildState;
  guilds: SocialGuild[];
  currentGuild: SocialGuild | null;
  guildDraft: string;
  onGuildDraftChange: (value: string) => void;
  onLogin: () => void;
  onCreateGuild: () => void;
  onJoinGuild: (guildId: string) => void;
  onLeaveGuild: () => void;
  onRaidGuildBoss: () => void;
  leaderboards: Partial<Record<LeaderboardCategory, LeaderboardEntry[]>>;
  leaderboardCategory: LeaderboardCategory;
  onLeaderboardCategoryChange: (category: LeaderboardCategory) => void;
  currentRanks: Partial<Record<LeaderboardCategory, number | null>>;
  weeklyRanking: WeeklyRankingEntry[];
  weeklyRank: number | null;
  canClaimWeeklyReward: boolean;
  onClaimWeeklyReward: () => void;
  pvpState: PvpState;
  shadowOpponents: ShadowSnapshot[];
  onShadowBattle: (opponent: ShadowSnapshot) => void;
  status: string;
}) {
  const [tab, setTab] = useState<SocialTab>("guild");
  const categoryButtons = useMemo(
    () => [
      { id: "power" as const, label: "Power" },
      { id: "level" as const, label: "Level" },
      { id: "stage" as const, label: "Stage" },
      { id: "bossKills" as const, label: "Bosses" },
      { id: "goldEarned" as const, label: "Gold" }
    ],
    []
  );
  const activeBoard = leaderboards[leaderboardCategory] ?? [];

  return (
    <div className="isw-panel isw-social">
      <div className="isw-social__header">
        <div>
          <span className="isw-section-label">Social Hub</span>
          <h3 className="isw-social__title">{user ? user.username : "Guest Adventurer"}</h3>
          <span className="isw-section-sub">{status}</span>
        </div>
        {!user && (
          <button className="isw-mini-btn" type="button" onClick={onLogin}>
            Login
          </button>
        )}
      </div>

      <div className="isw-social__tabs">
        {[
          { id: "guild" as const, label: "Guild" },
          { id: "leaderboard" as const, label: "Ranking" },
          { id: "pvp" as const, label: "PvP" }
        ].map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`isw-social__tab${tab === entry.id ? " is-active" : ""}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "guild" && (
        <div className="isw-social__stack">
          <div className="isw-social__card">
            <div className="isw-section-head">
              <span className="isw-section-label">Current Guild</span>
              <span className="isw-section-sub">
                Lv.{guildState.guildLevel} · {guildState.memberCount || currentGuild?.members.length || 0} members
              </span>
            </div>
            {currentGuild ? (
              <>
                <div className="isw-social__guild-hero">
                  <div>
                    <strong>{currentGuild.icon} {currentGuild.name}</strong>
                    <p>XP boost, gold boost and shared damage from guild progress.</p>
                  </div>
                  <button className="isw-mini-btn" type="button" onClick={onLeaveGuild}>
                    Leave
                  </button>
                </div>
                <div className="isw-social__raid">
                  <div className="isw-social__raid-head">
                    <strong>{currentGuild.raid.bossName}</strong>
                    <span>{formatNumber(currentGuild.raid.hp)} / {formatNumber(currentGuild.raid.maxHp)}</span>
                  </div>
                  <div className="isw-social__track">
                    <motion.div
                      className="isw-social__track-fill is-raid"
                      animate={{ width: `${Math.max(0, Math.min(100, (currentGuild.raid.hp / currentGuild.raid.maxHp) * 100))}%` }}
                    />
                  </div>
                  <div className="isw-social__raid-actions">
                    <span>Your contribution {formatNumber(guildState.raidContribution)}</span>
                    <button className="isw-action-btn is-ready" type="button" onClick={onRaidGuildBoss}>
                      Raid
                    </button>
                  </div>
                </div>
                <div className="isw-social__members">
                  {currentGuild.members.slice(0, 6).map((member) => (
                    <div className="isw-social__member" key={member.userId}>
                      <span>{member.username}</span>
                      <small>Lv.{member.level} · {formatNumber(member.power)}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="isw-online-row">
                  <input value={guildDraft} onChange={(event) => onGuildDraftChange(event.target.value)} placeholder="Guild name" />
                  <button className="isw-action-btn" type="button" onClick={onCreateGuild}>
                    Create
                  </button>
                </div>
                <div className="isw-social__guild-list">
                  {guilds.slice(0, 6).map((guild) => (
                    <button className="isw-social__guild-card" key={guild.id} type="button" onClick={() => onJoinGuild(guild.id)}>
                      <strong>{guild.icon} {guild.name}</strong>
                      <span>Lv.{guild.level} · {guild.members.length} members</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="isw-social__stack">
          <div className="isw-social__card">
            <div className="isw-social__filters">
              {categoryButtons.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`isw-social__filter${leaderboardCategory === entry.id ? " is-active" : ""}`}
                  onClick={() => onLeaderboardCategoryChange(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <div className="isw-social__rank-list">
              {activeBoard.slice(0, 8).map((entry) => (
                <div className={`isw-social__rank-row${entry.isCurrentPlayer ? " is-self" : ""}`} key={`${leaderboardCategory}-${entry.userId}`}>
                  <span>#{entry.rank}</span>
                  <strong>{entry.username}</strong>
                  <small>{entry.guildName ?? "Solo"}</small>
                  <span>{formatNumber(entry.value)}</span>
                </div>
              ))}
            </div>
            <div className="isw-social__rank-meta">
              <span>Your rank: {currentRanks[leaderboardCategory] ?? "-"}</span>
            </div>
          </div>

          <div className="isw-social__card">
            <div className="isw-section-head">
              <span className="isw-section-label">Weekly PvE</span>
              <span className="isw-section-sub">Rank {weeklyRank ?? "-"}</span>
            </div>
            <div className="isw-social__rank-list">
              {weeklyRanking.slice(0, 6).map((entry) => (
                <div className={`isw-social__rank-row${entry.isCurrentPlayer ? " is-self" : ""}`} key={`weekly-${entry.userId}`}>
                  <span>#{entry.rank}</span>
                  <strong>{entry.username}</strong>
                  <small>Stage {entry.stageProgress} · Boss {entry.bossClears}</small>
                  <span>{entry.reward.crystals}💎</span>
                </div>
              ))}
            </div>
            <button className="isw-action-btn is-ready" type="button" onClick={onClaimWeeklyReward} disabled={!canClaimWeeklyReward}>
              {canClaimWeeklyReward ? "Claim Weekly" : "Weekly Locked"}
            </button>
          </div>
        </div>
      )}

      {tab === "pvp" && (
        <div className="isw-social__stack">
          <div className="isw-social__card">
            <div className="isw-social__pvp-stats">
              <div>
                <span className="isw-section-label">Rating</span>
                <strong>{pvpState.rating}</strong>
              </div>
              <div>
                <span className="isw-section-label">Wins</span>
                <strong>{pvpState.wins}</strong>
              </div>
              <div>
                <span className="isw-section-label">Losses</span>
                <strong>{pvpState.losses}</strong>
              </div>
              <div>
                <span className="isw-section-label">Streak</span>
                <strong>{pvpState.streak}</strong>
              </div>
            </div>
          </div>

          <div className="isw-social__pvp-grid">
            {shadowOpponents.map((opponent) => (
              <div className="isw-social__pvp-card" key={opponent.userId}>
                <strong>{opponent.username}</strong>
                <span>Lv.{opponent.level} · {formatNumber(opponent.power)}</span>
                <small>{opponent.guildName ?? "Shadow Duelist"}</small>
                <button className="isw-mini-btn" type="button" onClick={() => onShadowBattle(opponent)}>
                  Fight
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const SocialPanel = memo(SocialPanelInner);
