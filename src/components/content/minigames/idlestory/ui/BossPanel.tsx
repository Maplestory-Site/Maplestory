import { motion, AnimatePresence } from "framer-motion";
import { memo, useState } from "react";
import type { DatabaseMonster } from "../gameEngine";
import type { FullZone } from "../zoneSystem";
import type { BossDefinition, BossAbility } from "../bossSystem";
import { getBossPhaseConfig, getPhaseAbilities } from "../bossSystem";
import { formatNumber } from "../gameEngine";
import { sanitizeGameText, sanitizeMonsterPortrait } from "../textSanitizer";

function isBossImageUsable(src: string | null | undefined): src is string {
  const v = (src ?? "").trim();
  if (!v) return false;
  if (v.startsWith("data:image/")) return true;
  if (/^https?:\/\/\S+$/i.test(v)) return true;
  if (/^\/[^?#]+\.(png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i.test(v)) return true;
  return false;
}

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
  bossDefinition: BossDefinition | null;
  currentPhase: 1 | 2 | 3;
  activeMechanicId: string | null;
  mechanicTimeLeft: number;
  enrageTimeLeft: number;
  isEnraged: boolean;
  voiceLine: string | null;
};

const EFFECT_META: Record<string, { label: string; cls: string }> = {
  rage: { label: "Rage", cls: "isw-boss__mechanic-chip--rage" },
  shield: { label: "Shield", cls: "isw-boss__mechanic-chip--shield" },
  summon: { label: "Summons", cls: "isw-boss__mechanic-chip--summon" },
  aoe: { label: "AOE", cls: "isw-boss__mechanic-chip--aoe" },
  poison: { label: "Poison", cls: "isw-boss__mechanic-chip--poison" },
  freeze: { label: "Freeze", cls: "isw-boss__mechanic-chip--freeze" },
  lifesteal: { label: "Lifesteal", cls: "isw-boss__mechanic-chip--lifesteal" },
  enrage: { label: "Enrage", cls: "isw-boss__mechanic-chip--rage" },
  seal: { label: "Sealed", cls: "isw-boss__mechanic-chip--seal" },
  reflect: { label: "Reflect", cls: "isw-boss__mechanic-chip--shield" },
  regen: { label: "Regen", cls: "isw-boss__mechanic-chip--lifesteal" }
};

function BossPanelInner({
  zone,
  monster,
  hpPct,
  enemyHp,
  enemyMaxHp,
  stage,
  isHit,
  onRaid,
  onHunt,
  rewardMesos,
  rewardCrystals,
  bossDefinition,
  currentPhase,
  activeMechanicId,
  mechanicTimeLeft,
  enrageTimeLeft,
  isEnraged,
  voiceLine
}: Props) {
  const [bossImgBroken, setBossImgBroken] = useState(false);
  const isEnragedDisplay = isEnraged || hpPct <= 33;
  const bossName = sanitizeGameText(monster?.name ?? zone.bossName, "Zone Boss");
  const safeBossIcon = sanitizeMonsterPortrait(zone.bossIcon, "👾");
  const bossImageSrc = isBossImageUsable(monster?.image) && !bossImgBroken ? monster!.image : null;
  const phaseConfig = bossDefinition ? getBossPhaseConfig(bossDefinition, hpPct) : null;
  const phaseAbilities: BossAbility[] = bossDefinition ? getPhaseAbilities(bossDefinition, currentPhase) : [];
  const activeAbility = activeMechanicId
    ? bossDefinition?.abilities.find((a) => a.id === activeMechanicId) ?? null
    : null;
  const effectMeta = activeAbility ? (EFFECT_META[activeAbility.effect] ?? EFFECT_META.aoe) : null;

  const mechanicDuration = activeAbility?.duration ?? 1;
  const mechanicFraction = mechanicDuration > 0 ? Math.min(1, mechanicTimeLeft / mechanicDuration) : 0;
  const enrageTotal = bossDefinition?.enrageTimer ?? 0;
  const enrageFraction = enrageTotal > 0 ? Math.min(1, enrageTimeLeft / enrageTotal) : 0;
  const phaseColour = hpPct > 70 ? "#4ade80" : hpPct > 30 ? "#facc15" : "#ef4444";

  return (
    <div className={`isw-boss${isEnragedDisplay ? " is-enraged" : ""}`}>
      <div className={`isw-boss__glow${isEnragedDisplay ? " is-enraged" : ""}`} />

      <div className="isw-boss__header">
        <motion.div
          className="isw-boss__threat"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          BOSS ENCOUNTER - STAGE {stage}
        </motion.div>
        <div className={`isw-boss__name${isEnragedDisplay ? " is-enraged" : ""}`}>
          {safeBossIcon} {bossName}
        </div>
        <div className="isw-boss__subtitle">
          {sanitizeGameText(bossDefinition?.title ?? "Boss Encounter", "Boss Encounter")}
        </div>
        {isEnraged && (
          <motion.div
            className="isw-boss__enrage-tag"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            ENRAGED
          </motion.div>
        )}
      </div>

      {enrageTotal > 0 && !isEnraged && (
        <div className="isw-boss__enrage-timer">
          <div className="isw-boss__enrage-timer-label">
            <span>Enrage in</span>
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
                background:
                  enrageFraction < 0.3
                    ? "linear-gradient(90deg,#b91c1c,#ef4444)"
                    : enrageFraction < 0.6
                      ? "linear-gradient(90deg,#ca8a04,#facc15)"
                      : "linear-gradient(90deg,#166534,#4ade80)"
              }}
            />
          </div>
        </div>
      )}

      <div className="isw-boss__sprite-wrap">
        <AnimatePresence>
          {isHit && (
            <motion.div
              className="isw-boss__hit-burst"
              initial={{ opacity: 0.7, scale: 0.72 }}
              animate={{ opacity: 0, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
            />
          )}
        </AnimatePresence>
        <motion.div
          key={`${zone.id}-${bossName}`}
          className={`isw-boss__sprite${isHit ? " is-hit" : ""}${isEnragedDisplay ? " is-enraged" : ""}${bossImageSrc ? " has-image" : ""}`}
          initial={{ opacity: 0, y: 12, scale: 0.84 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, mass: 1.1 }}
        >
          {bossImageSrc ? (
            <img
              src={bossImageSrc}
              alt={bossName}
              loading="lazy"
              decoding="async"
              onError={() => setBossImgBroken(true)}
              className="isw-boss__sprite-img"
            />
          ) : (
            <span className="isw-boss__sprite-emoji" role="img" aria-label={bossName}>
              {sanitizeMonsterPortrait(monster?.portrait, safeBossIcon)}
            </span>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {voiceLine && (
          <motion.div
            key={voiceLine}
            className="isw-boss__voice-line"
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.3 }}
          >
            {sanitizeGameText(voiceLine, "")}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="isw-boss__hp-section">
        <div className="isw-boss__phases">
          {([1, 2, 3] as const).map((p) => (
            <div
              key={p}
              className={`isw-boss__phase-dot${currentPhase >= p ? " is-active" : ""}${currentPhase === p ? " is-current" : ""}`}
              title={sanitizeGameText(bossDefinition?.phases[p - 1].label ?? `Phase ${p}`, `Phase ${p}`)}
            />
          ))}
          <span className="isw-boss__phase-label" style={{ color: phaseColour }}>
            {sanitizeGameText(phaseConfig?.label ?? (hpPct > 70 ? "Phase 1" : hpPct > 30 ? "Phase 2" : "Enrage"), "Phase")}
          </span>
          {phaseConfig && (
            <span className="isw-boss__phase-desc">{sanitizeGameText(phaseConfig.description, "")}</span>
          )}
        </div>

        <div className="isw-boss__hp-nums">
          <span className="isw-boss__hp-val">{formatNumber(enemyHp)}</span>
          <span className="isw-boss__hp-sep">/</span>
          <span className="isw-boss__hp-max">{formatNumber(enemyMaxHp)}</span>
          <span className="isw-boss__hp-pct" style={{ color: phaseColour }}>
            {Math.round(hpPct)}%
          </span>
        </div>

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
              <span className="isw-boss__mechanic-bar-icon">{sanitizeMonsterPortrait(activeAbility.icon, "⚡")}</span>
              <span className={`isw-boss__mechanic-chip ${effectMeta.cls}`}>{effectMeta.label}</span>
              <strong className="isw-boss__mechanic-bar-name">{sanitizeGameText(activeAbility.name, "Ability")}</strong>
              {mechanicTimeLeft > 0 && (
                <span className="isw-boss__mechanic-bar-time">{Math.ceil(mechanicTimeLeft)}s</span>
              )}
            </div>
            <p className="isw-boss__mechanic-bar-desc">{sanitizeGameText(activeAbility.description, "")}</p>
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

      {phaseAbilities.length > 0 && (
        <div className="isw-boss__abilities">
          {phaseAbilities.map((ab) => {
            const meta = EFFECT_META[ab.effect];
            const isActive = ab.id === activeMechanicId;
            return (
              <div
                key={ab.id}
                className={`isw-boss__ability-chip${isActive ? " is-active" : ""}`}
                title={`${sanitizeGameText(ab.name, "Ability")}: ${sanitizeGameText(ab.description, "")}`}
              >
                <span>{sanitizeMonsterPortrait(ab.icon, "✨")}</span>
                <span>{sanitizeGameText(ab.name, "Ability")}</span>
                {meta && <span className={`isw-boss__ability-tag ${meta.cls}`}>{meta.label}</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="isw-boss__rewards">
        <span className="isw-boss__rewards-label">On kill:</span>
        <span className="isw-boss__reward-chip isw-boss__reward-chip--gold">
          Gold {formatNumber(rewardMesos)}
        </span>
        <span className="isw-boss__reward-chip isw-boss__reward-chip--crystal">
          Crystals +{rewardCrystals}
        </span>
        <span className="isw-boss__reward-chip isw-boss__reward-chip--fame">
          Fame +{bossDefinition?.rewards.fameBonus ?? 12}
        </span>
        {enrageTotal > 0 && !isEnraged && enrageTimeLeft < enrageTotal && (
          <span className="isw-boss__reward-chip isw-boss__reward-chip--speed">
            Speed x2
          </span>
        )}
        <span className={`isw-boss__reward-chip isw-boss__reward-chip--rarity isw-rarity--${bossDefinition?.rewards.guaranteedRarity ?? "rare"}`}>
          {sanitizeGameText(bossDefinition?.rewards.guaranteedRarity?.toUpperCase() ?? "RARE", "RARE")} loot
        </span>
      </div>

      <div className="isw-boss__actions">
        <motion.button
          className="isw-boss__strike-btn"
          onClick={onRaid}
          whileTap={{ scale: 0.93, y: 3 }}
          type="button"
        >
          Boss Strike
        </motion.button>
        <motion.button
          className="isw-boss__auto-btn"
          onClick={onHunt}
          whileTap={{ scale: 0.93 }}
          type="button"
        >
          Auto Attack
        </motion.button>
      </div>

      {bossDefinition?.lore && (
        <p className="isw-boss__lore">{sanitizeGameText(bossDefinition.lore, "")}</p>
      )}
    </div>
  );
}

export const BossPanel = memo(BossPanelInner);
