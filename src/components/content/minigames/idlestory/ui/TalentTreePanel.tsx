/**
 * TalentTreePanel — permanent talent tree UI.
 *
 * Shows 4 branches as columns. Each node displays:
 *   icon · name · description · cost
 *   State: locked / available / affordable / unlocked
 */

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import type { IdleGameState, TalentNodeId } from "../gameEngine";
import {
  TALENT_NODES,
  TALENT_BRANCHES,
  TALENT_BRANCH_NODES,
  canUnlockTalent,
  getTalentStats,
  type TalentBranchId
} from "../talentSystem";

type Props = {
  state: IdleGameState;
  onBuyTalent: (id: TalentNodeId) => void;
};

function TalentTreePanelInner({ state, onBuyTalent }: Props) {
  const talentNodes = state.talentNodes ?? {};
  const talentPoints = state.talentPoints ?? 0;
  const stats = useMemo(() => getTalentStats(talentNodes), [talentNodes]);

  const branchOrder: TalentBranchId[] = ["combat", "economy", "progression", "mastery"];

  return (
    <div className="isw-panel isw-talent-panel">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="isw-talent-header">
        <div className="isw-talent-header__pts">
          <span className="isw-talent-header__pts-icon">✦</span>
          <span className="isw-talent-header__pts-val">{talentPoints}</span>
          <span className="isw-talent-header__pts-label">
            Talent Point{talentPoints !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="isw-talent-header__unlock">
          {stats.unlockedCount}/{stats.totalNodes} unlocked
        </div>
      </div>

      {/* ── Earn hint ─────────────────────────────────────────────────────── */}
      <div className="isw-talent-earn-hint">
        <span>+1 pt per Prestige</span>
        <span className="isw-talent-earn-hint__sep">·</span>
        <span>+3 pts per Rebirth</span>
      </div>

      {/* ── Stats summary ─────────────────────────────────────────────────── */}
      {stats.unlockedCount > 0 && (
        <div className="isw-talent-stats">
          <StatChip icon="⚔" label="DPS" value={`×${stats.dpsMult.toFixed(2)}`} />
          <StatChip icon="💰" label="Gold" value={`×${stats.goldMult.toFixed(2)}`} />
          <StatChip icon="⭐" label="XP" value={`×${stats.xpMult.toFixed(2)}`} />
          <StatChip icon="💠" label="Crystals" value={`×${stats.crystalMult.toFixed(2)}`} />
        </div>
      )}

      {/* ── Branches ──────────────────────────────────────────────────────── */}
      <div className="isw-talent-branches">
        {branchOrder.map(branchId => {
          const branch = TALENT_BRANCHES[branchId];
          const nodeIds = TALENT_BRANCH_NODES[branchId];

          // Mastery branch: show lock overlay if not yet unlocked
          const branchLocked = branchId === "mastery" && state.prestigeCount < 1;

          return (
            <div key={branchId} className={`isw-talent-branch isw-talent-branch--${branchId}`}>
              <div
                className="isw-talent-branch__header"
                style={{ color: branch.color, borderColor: branch.color + "44" }}
              >
                <span className="isw-talent-branch__icon">{branch.icon}</span>
                <span className="isw-talent-branch__name">{branch.name}</span>
              </div>

              {branchLocked ? (
                <div className="isw-talent-branch__locked">
                  <span className="isw-talent-branch__locked-icon">🔒</span>
                  <span className="isw-talent-branch__locked-text">
                    Requires 1 Prestige
                  </span>
                </div>
              ) : (
                <div className="isw-talent-nodes">
                  {nodeIds.map((nodeId, idx) => {
                    const def = TALENT_NODES[nodeId];
                    const isUnlocked = Boolean(talentNodes[nodeId]);
                    const check = canUnlockTalent(
                      nodeId, talentNodes, talentPoints,
                      state.prestigeCount, state.rebirthCount
                    );
                    const isAffordable = !isUnlocked && check.canUnlock;
                    const hasPrereqs = def.requires
                      ? def.requires.every(r => Boolean(talentNodes[r]))
                      : true;
                    const meetsGates =
                      (def.requiresPrestige === undefined || state.prestigeCount >= def.requiresPrestige) &&
                      (def.requiresRebirth === undefined || state.rebirthCount >= def.requiresRebirth);
                    const isVisible = hasPrereqs && meetsGates;
                    const isLocked = !isUnlocked && (!isVisible || !isAffordable);

                    // connector line above all nodes except the first
                    const showConnector = idx > 0;

                    return (
                      <div key={nodeId} className="isw-talent-node-wrap">
                        {showConnector && (
                          <div
                            className={`isw-talent-connector${isUnlocked ? " is-lit" : ""}`}
                            style={{ borderColor: isUnlocked ? branch.color + "99" : undefined }}
                          />
                        )}
                        <motion.button
                          type="button"
                          className={[
                            "isw-talent-node",
                            isUnlocked ? "is-unlocked" : isAffordable ? "is-affordable" : "is-locked",
                          ].join(" ")}
                          style={isUnlocked
                            ? { borderColor: branch.color, boxShadow: `0 0 8px ${branch.color}55` }
                            : isAffordable
                              ? { borderColor: branch.color + "88" }
                              : undefined
                          }
                          onClick={() => isAffordable && onBuyTalent(nodeId)}
                          disabled={!isAffordable}
                          whileTap={isAffordable ? { scale: 0.94 } : undefined}
                          title={isLocked && check.reason ? check.reason : def.description}
                        >
                          <span className="isw-talent-node__icon">{def.icon}</span>
                          <div className="isw-talent-node__body">
                            <span className="isw-talent-node__name">{def.name}</span>
                            <span className="isw-talent-node__desc">{def.description}</span>
                          </div>
                          <div className="isw-talent-node__cost">
                            {isUnlocked ? (
                              <span className="isw-talent-node__check">✓</span>
                            ) : (
                              <>
                                <span className="isw-talent-node__pts">{def.cost}</span>
                                <span className="isw-talent-node__pts-label">pt{def.cost !== 1 ? "s" : ""}</span>
                              </>
                            )}
                          </div>
                          {/* Requirement tooltip on locked nodes */}
                          {isLocked && !isUnlocked && check.reason && (
                            <div className="isw-talent-node__req">{check.reason}</div>
                          )}
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer hint ───────────────────────────────────────────────────── */}
      <p className="isw-talent-footer">
        Talents are <strong>permanent</strong> — they survive prestige and rebirth.
      </p>
    </div>
  );
}

export const TalentTreePanel = memo(TalentTreePanelInner);

// ─── Stat chip helper ─────────────────────────────────────────────────────────

function StatChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="isw-talent-stat-chip">
      <span className="isw-talent-stat-chip__icon">{icon}</span>
      <span className="isw-talent-stat-chip__label">{label}</span>
      <span className="isw-talent-stat-chip__value">{value}</span>
    </div>
  );
}
