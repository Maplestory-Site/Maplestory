/**
 * BossPanel — AAA boss encounter overlay.
 * Features:
 *   • 3-phase HP bar with phase dots and labels
 *   • Active mechanic status bar with live countdown
 *   • Enrage timer countdown ring
 *   • Boss voice line speech bubble (auto-fades)
 *   • Ability chip row showing active-phase abilities
 *   • Hit burst animation + enrage visual states
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DatabaseMonster } from "../gameEngine";
import type { FullZone } from "../zoneSystem";
import type { BossDefinition, BossAbility } from "../bossSystem";
import { getBossPhaseConfig, getPhaseAbilities } from "../bossSystem";
import { formatNumber } from "../gameEngine";

type Props = {
  zone: FullZone;
  monster: DatabaseMonster | null;
  hpPct: number;
  enemyHp: number;
  enemyMaxHp: number;
  stage: number;
  isHit: boolean;
  onRaid: () => void;
  onHunt: () => void;
  rewardMesos: number;
  rewardCrystals: number;
  // AAA boss system
  bossDefinition: BossDefinition | null;
  currentPhase: 1 | 2 | 3;
  activeMechanicId: string | null;
  mechanicTimeLeft: number;
  enrageTimeLeft: number;
  isEnraged: boolean;
  voiceLine: string | null;
};

// Effect → label + colour class
const EFFECT_META: Record<string, { label: string; cls: string }> = {
  rage:      { label: "Rage",       cls: "isw-boss__mechanic-chip--rage"    },
  shield:    { label: "Shield",     cls: "isw-boss__mechanic-chip--shield"  },
  summon:    { label: "Summons",    cls: "isw-boss__mechanic-chip--summon"  },
  aoe:       { label: "AOE",        cls: "isw-boss__mechanic-chip--aoe"     },
  poison:    { label: "Poison",     cls: "isw-boss__mechanic-chip--poison"  },
  freeze:    { label: "FREEZE",     cls: "isw-boss__mechanic-chip--freeze"  },
  lifesteal: { label: "Lifesteal",  cls: "isw-boss__mechanic-chip--lifesteal"},
  enrage:    { label: "Enrage!",    cls: "isw-boss__mechanic-chip--rage"    },
  seal:      { label: "Sealed",     cls: "isw-boss__mechanic-chip--seal"    },
  reflect:   { label: "Reflect",    cls: "isw-boss__mechanic-chip--shield"  },
  regen:     { label: "Regen",      cls: "isw-boss__mechanic-chip--lifesteal"},
};

export function BossPanel({
  zone, monster, hpPct, enemyHp, enemyMaxHp,
  stage, isHit, onRaid, onHunt, rewardMesos, rewardCrystals,
  bossDefinition, currentPhase, activeMechanicId,
  mechanicTimeLeft, enrageTimeLeft, isEnraged, voiceLine
}: Props) {
  const isEnragedDisplay = isEnraged || hpPct <= 33;
  const bossName = monster?.name ?? zone.bossName;
  const phaseConfig = bossDefinition ? getBossPhaseConfig(bossDefinition, hpPct) : null;
  const phaseAbilities: BossAbility[] = bossDefinition ? getPhaseAbilities(bossDefinition, currentPhase) : [];
  const activeAbility = activeMechanicId
    ? bossDefinition?.abilities.find(a => a.id === activeMechanicId) ?? null
    : null;
  const effectMeta = activeAbility ? (EFFECT_META[activeAbility.effect] ?? EFFECT_META.aoe) : null;

  // Mechanic bar fraction
  const mechanicDuration = activeAbility?.duration ?? 1;
  const mechanicFraction = mechanicDuration > 0 ? Math.min(1, mechanicTimeLeft / mechanicDuration) : 0;

  // Enrage bar fraction — original enrage timer from boss def
  const enrageTotal = bossDefinition?.enrageTimer ?? 0;
  const enrageFraction = enrageTotal > 0 ? Math.min(1, enrageTimeLeft / enrageTotal) : 0;

  // Phase colour
  const phaseColour = hpPct > 70 ? "#4ade80" : hpPct > 30 ? "#facc15" : "#ef4444";

  // Local voice-line visibility
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [shownVoice, setShownVoice] = useState("");
  useEffect(() => {
    if (!voiceLine) { setVoiceVisible(false); return; }
    setShownVoice(voiceLine);
    setVoiceVisible(true);
    const t = setTimeout(() => setVoiceVisible(false), 4200);
    return () => clearTimeout(t);
  }, [voiceLine]);

  return (
    <div className={`isw-boss${isEnragedDisplay ? " is-enraged" : ""}`}>
      {/* Dramatic backdrop glow */}
      <div className={`isw-boss__glow${isEnragedDisplay ? " is-enraged" : ""}`} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="isw-boss__header">
        <motion.div
          className="isw-boss__threat"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          ⚠ BOSS ENCOUNTER — STAGE {stage}
        </motion.div>
        <div className={`isw-boss__name${isEnragedDisplay ? " is-enraged" : ""}`}>
          {zone.bossIcon} {bossName}
        </div>
        <div className="isw-boss__subtitle">
          {bossDefinition?.title ?? "Boss Encounter"}
        </div>
        {isEnraged && (
          <motion.div
            className="isw-boss__enrage-tag"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            🔥 ENRAGED
          </motion.div>
        )}
      </div>

      {/* ── Enrage timer ────────────────────────────────────────────────── */}
      {enrageTotal > 0 && !isEnraged && (
        <div className="isw-boss__enrage-timer">
          <div className="isw-boss__enrage-timer-label">
            <span>⏱ Enrage in</span>
            <strong style={{ color: enrageFraction < 0.3 ? "#ef4444" : enrageFraction < 0.6 ? "#facc15" : "#4ade80" }}>
              {Math.ceil(enrageTimeLeft)}s
            </strong>
          </div>
          <div className="isw-boss__enrage-track">
            <motion.div
              className="isw-boss__enrage-fill"
              animate={{ width: `${enrageFraction * 100}%` }}
              transition={{ duration: 0.4, ease: "linear" }}
              style={{
                background: enrageFraction < 0.3 ? "linear-gradient(90deg,#b91c1c,#ef4444)"
                          : enrageFraction < 0.6 ? "linear-gradient(90deg,#ca8a04,#facc15)"
                          : "linear-gradient(90deg,#166534,#4ade80)"
              }}
            />
          </div>
        </div>
      )}

      {/* ── Sprite ──────────────────────────────────────────────────────── */}
      <div className="isw-boss__sprite-wrap">
        <AnimatePresence>
          {isHit && (
            <motion.div
              className="isw-boss__hit-burst"
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32 }}
            />
          )}
        </AnimatePresence>
        <div className={`isw-boss__sprite${isHit ? " is-hit" : ""}${isEnragedDisplay ? " is-enraged" : ""}`}>
          {monster?.image
            ? <img src={monster.image} alt={bossName} />
            : <span className="isw-boss__sprite-emoji" role="img" aria-label={bossName}>
                {(monster as (typeof monster & { portrait?: string }) | null)?.portrait ?? zone.bossIcon}
              </span>
          }
        </div>
      </div>

      {/* ── Voice line bubble ────────────────────────────────────────────── */}
      <AnimatePresence>
        {voiceVisible && shownVoice && (
          <motion.div
            key={shownVoice}
            className="isw-boss__voice-line"
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.3 }}
          >
            {shownVoice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase + HP bar ───────────────────────────────────────────────── */}
      <div className="isw-boss__hp-section">
        {/* Phase label row */}
        <div className="isw-boss__phases">
          {([1, 2, 3] as const).map(p => (
            <div
              key={p}
              className={`isw-boss__phase-dot${currentPhase >= p ? " is-active" : ""}${currentPhase === p ? " is-current" : ""}`}
              title={bossDefinition?.phases[p - 1].label ?? `Phase ${p}`}
            />
          ))}
          <span className="isw-boss__phase-label" style={{ color: phaseColour }}>
            {phaseConfig?.label ?? (hpPct > 70 ? "Phase 1" : hpPct > 30 ? "Phase 2" : "Enrage")}
          </span>
          {phaseConfig && (
            <span className="isw-boss__phase-desc">{phaseConfig.description}</span>
          )}
        </div>

        {/* HP numbers */}
        <div className="isw-boss__hp-nums">
          <span className="isw-boss__hp-val">{formatNumber(enemyHp)}</span>
          <span className="isw-boss__hp-sep">/</span>
          <span className="isw-boss__hp-max">{formatNumber(enemyMaxHp)}</span>
          <span className="isw-boss__hp-pct" style={{ color: phaseColour }}>
            {Math.round(hpPct)}%
          </span>
        </div>

        {/* HP track */}
        <div className="isw-boss__hp-track">
          <div className="isw-boss__hp-marker" style={{ left: "70%" }} />
          <div className="isw-boss__hp-marker" style={{ left: "30%" }} />
          <motion.div
            className={`isw-boss__hp-fill${isEnragedDisplay ? " is-enraged" : hpPct <= 30 ? " is-phase2" : ""}`}
            animate={{ width: `${hpPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ── Active mechanic ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeAbility && effectMeta && (
          <motion.div
            key={activeAbility.id}
            className="isw-boss__mechanic-bar"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <div className="isw-boss__mechanic-bar-top">
              <span className="isw-boss__mechanic-bar-icon">{activeAbility.icon}</span>
              <span className={`isw-boss__mechanic-chip ${effectMeta.cls}`}>{effectMeta.label}</span>
              <strong className="isw-boss__mechanic-bar-name">{activeAbility.name}</strong>
              {mechanicTimeLeft > 0 && (
                <span className="isw-boss__mechanic-bar-time">{Math.ceil(mechanicTimeLeft)}s</span>
              )}
            </div>
            <p className="isw-boss__mechanic-bar-desc">{activeAbility.description}</p>
            {mechanicTimeLeft > 0 && mechanicDuration > 0 && (
              <div className="isw-boss__mechanic-progress">
                <motion.div
                  className={`isw-boss__mechanic-progress-fill ${effectMeta.cls}`}
                  animate={{ width: `${mechanicFraction * 100}%` }}
                  transition={{ duration: 0.5, ease: "linear" }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ability chips for current phase ─────────────────────────────── */}
      {phaseAbilities.length > 0 && (
        <div className="isw-boss__abilities">
          {phaseAbilities.map(ab => {
            const meta = EFFECT_META[ab.effect];
            const isActive = ab.id === activeMechanicId;
            return (
              <div
                key={ab.id}
                className={`isw-boss__ability-chip${isActive ? " is-active" : ""}`}
                title={`${ab.name}: ${ab.description}`}
              >
                <span>{ab.icon}</span>
                <span>{ab.name}</span>
                {meta && <span className={`isw-boss__ability-tag ${meta.cls}`}>{meta.label}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Reward preview ───────────────────────────────────────────────── */}
      <div className="isw-boss__rewards">
        <span className="isw-boss__rewards-label">On kill:</span>
        <span className="isw-boss__reward-chip isw-boss__reward-chip--gold">
          💰 {formatNumber(rewardMesos)}
        </span>
        <span className="isw-boss__reward-chip isw-boss__reward-chip--crystal">
          💎 +{rewardCrystals}
        </span>
        <span className="isw-boss__reward-chip isw-boss__reward-chip--fame">
          🏆 +{bossDefinition?.rewards.fameBonus ?? 12}
        </span>
        {enrageTotal > 0 && !isEnraged && enrageTimeLeft < enrageTotal && (
          <span className="isw-boss__reward-chip isw-boss__reward-chip--speed">
            ⚡ Speed ×2
          </span>
        )}
        <span className={`isw-boss__reward-chip isw-boss__reward-chip--rarity isw-rarity--${bossDefinition?.rewards.guaranteedRarity ?? "rare"}`}>
          {bossDefinition?.rewards.guaranteedRarity?.toUpperCase() ?? "RARE"} loot
        </span>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="isw-boss__actions">
        <motion.button
          className="isw-boss__strike-btn"
          onClick={onRaid}
          whileTap={{ scale: 0.93, y: 3 }}
          type="button"
        >
          💥 Boss Strike
        </motion.button>
        <motion.button
          className="isw-boss__auto-btn"
          onClick={onHunt}
          whileTap={{ scale: 0.93 }}
          type="button"
        >
          ⚔ Auto Attack
        </motion.button>
      </div>

      {/* Boss lore line at bottom */}
      {bossDefinition?.lore && (
        <p className="isw-boss__lore">{bossDefinition.lore}</p>
      )}
    </div>
  );
}
