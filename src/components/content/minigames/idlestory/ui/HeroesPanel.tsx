/**
 * HeroesPanel — Premium hero collection & management screen.
 * Shows 3 class heroes (Snailguard, Mage, Archer) as character cards
 * with class identity, stats, and upgrade actions.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatNumber } from "../gameEngine";
import { HEROES, getHeroCost, UPGRADES, getUpgradeCost, getUpgradeEffect, SKILLS, getSkillCost, getSkillEffect } from "../progressionSystem";
import type { IdleGameState, HeroId } from "../gameEngine";
import { CLASSES } from "../classSystem";

type Props = {
  state: IdleGameState;
  onBuyHero: (id: HeroId) => void;
  onBuyUpgrade: (id: keyof typeof UPGRADES) => void;
  onTrainSkill: (id: keyof typeof SKILLS) => void;
  onBestHero: () => void;
  onBestUpgrade: () => void;
  onBestSkill: () => void;
  /** Tutorial: ID of the element to pulse-highlight, e.g. "snailguard_btn". */
  tutorialTarget?: string | null;
};

// Visual identity per hero
const HERO_VISUALS: Record<HeroId, {
  classKey: "warrior" | "mage" | "archer";
  icon: string;
  portrait: string;
  color: string;
  bgGradient: string;
  statLabel: string;
}> = {
  snailguard: {
    classKey: "warrior",
    icon: "🐌",
    portrait: "🛡️",
    color: "#ef4444",
    bgGradient: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
    statLabel: "Frontline Tank",
  },
  mage: {
    classKey: "mage",
    icon: "🧙",
    portrait: "✨",
    color: "#818cf8",
    bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    statLabel: "Arcane Burst",
  },
  archer: {
    classKey: "archer",
    icon: "🏹",
    portrait: "🎯",
    color: "#4ade80",
    bgGradient: "linear-gradient(135deg, #14532d 0%, #166534 100%)",
    statLabel: "Critical Shots",
  },
  ironwall: {
    classKey: "warrior",
    icon: "IW",
    portrait: "SH",
    color: "#f97316",
    bgGradient: "linear-gradient(135deg, #431407 0%, #9a3412 100%)",
    statLabel: "Boss Tank",
  },
  pyromancer: {
    classKey: "mage",
    icon: "PY",
    portrait: "FM",
    color: "#fb7185",
    bgGradient: "linear-gradient(135deg, #4c0519 0%, #be123c 100%)",
    statLabel: "Fire Burst",
  },
  falconer: {
    classKey: "archer",
    icon: "SK",
    portrait: "CR",
    color: "#38bdf8",
    bgGradient: "linear-gradient(135deg, #082f49 0%, #0369a1 100%)",
    statLabel: "Legend Crit",
  },
};

export function HeroesPanel({
  state, onBuyHero, onBuyUpgrade, onTrainSkill,
  onBestHero, onBestUpgrade, onBestSkill,
  tutorialTarget
}: Props) {
  const [selected, setSelected] = useState<HeroId | null>(null);
  const [activeSection, setActiveSection] = useState<"heroes" | "town" | "training">("heroes");

  return (
    <div className="isw-panel isw-heroes">

      {/* ── Section switcher ── */}
      <div className="isw-heroes__nav">
        {(["heroes", "town", "training"] as const).map(s => (
          <button
            key={s}
            type="button"
            className={`isw-heroes__nav-btn${activeSection === s ? " is-active" : ""}`}
            onClick={() => setActiveSection(s)}
          >
            {s === "heroes" ? "⚔ Heroes" : s === "town" ? "🏠 Town" : "📚 Training"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSection === "heroes" && (
          <motion.div
            key="heroes"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            {/* Party summary */}
            <div className="isw-heroes__party">
              {(Object.keys(HEROES) as HeroId[]).map(id => {
                const vis = HERO_VISUALS[id];
                const lv = state.heroLevels[id];
                return (
                  <motion.button
                    key={id}
                    type="button"
                    className={`isw-heroes__party-avatar${lv > 0 ? " is-active" : ""}${selected === id ? " is-selected" : ""}`}
                    style={{ borderColor: vis.color + (lv > 0 ? "88" : "22") }}
                    onClick={() => setSelected(selected === id ? null : id)}
                    whileTap={{ scale: 0.88 }}
                  >
                    <span className="isw-heroes__party-icon">{vis.icon}</span>
                    {lv > 0 && <span className="isw-heroes__party-lv">{lv}</span>}
                  </motion.button>
                );
              })}
              <motion.button
                className="isw-section-best"
                onClick={onBestHero}
                whileTap={{ scale: 0.93 }}
                type="button"
                style={{ marginLeft: "auto" }}
              >
                Best ↑
              </motion.button>
            </div>

            {/* Hero cards */}
            <div className="isw-heroes__cards">
              {(Object.entries(HEROES) as [HeroId, typeof HEROES[HeroId]][]).map(([id, hero]) => {
                const vis = HERO_VISUALS[id];
                const lv = state.heroLevels[id];
                const cost = getHeroCost(id, lv);
                const canAfford = state.mesos >= cost;
                const isExpanded = selected === id;
                const cls = CLASSES[vis.classKey];

                return (
                  <motion.div
                    key={id}
                    className={`isw-hero-card${isExpanded ? " is-expanded" : ""}${lv > 0 ? " is-recruited" : ""}`}
                    style={{ ["--hero-color" as string]: vis.color }}
                    layout
                  >
                    {/* Card header */}
                    <div
                      className="isw-hero-card__header"
                      style={{ background: vis.bgGradient }}
                      onClick={() => setSelected(isExpanded ? null : id)}
                    >
                      <div className="isw-hero-card__portrait">{vis.icon}</div>
                      <div className="isw-hero-card__identity">
                        <div className="isw-hero-card__name" style={{ color: vis.color }}>
                          {hero.name}
                        </div>
                        <div className="isw-hero-card__role">{vis.statLabel}</div>
                        <div className="isw-hero-card__class">
                          {cls.icon} {cls.name}
                        </div>
                      </div>
                      <div className="isw-hero-card__level-badge" style={{ background: vis.color }}>
                        Lv.{lv}
                      </div>
                    </div>

                    {/* Stats bar */}
                    <div className="isw-hero-card__stats">
                      <div className="isw-hero-card__stat">
                        <span>⚔ ATK</span>
                        <strong>{hero.baseDps * lv}</strong>
                      </div>
                      <div className="isw-hero-card__stat">
                        <span>DPS/lv</span>
                        <strong>+{hero.baseDps}</strong>
                      </div>
                      <div className="isw-hero-card__stat">
                        <span>Cost</span>
                        <strong style={{ color: canAfford ? "var(--success)" : "var(--text-2)" }}>
                          {formatNumber(cost)}
                        </strong>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          className="isw-hero-card__details"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                        >
                          <div className="isw-hero-card__detail-row">
                            <span>Passive</span>
                            <strong>{cls.passive.name}</strong>
                          </div>
                          <div className="isw-hero-card__detail-row">
                            <span>Triggers every</span>
                            <strong>{cls.passive.triggerEvery} hits</strong>
                          </div>
                          <div className="isw-hero-card__detail-row">
                            <span>Burst mult</span>
                            <strong>×{cls.passive.damageMult}</strong>
                          </div>
                          <div className="isw-hero-card__detail-row">
                            <span>Resource</span>
                            <strong style={{ textTransform: "capitalize" }}>{cls.resource}</strong>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Upgrade button */}
                    <motion.button
                      className={`isw-hero-card__upgrade${canAfford ? " can-afford" : ""}${tutorialTarget === "snailguard_btn" && id === "snailguard" ? " isw-tutorial-glow" : ""}`}
                      onClick={() => onBuyHero(id)}
                      whileTap={{ scale: 0.94, y: 2 }}
                      type="button"
                    >
                      {lv === 0 ? "Recruit" : "Upgrade"} — 💰 {formatNumber(cost)}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSection === "town" && (
          <motion.div
            key="town"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            <div className="isw-section-head">
              <span className="isw-section-label">Town Add-ons</span>
              <motion.button className="isw-section-best" onClick={onBestUpgrade} whileTap={{ scale: 0.93 }} type="button">
                Best ↑
              </motion.button>
            </div>
            <div className="isw-upgrade-row">
              {(Object.keys(UPGRADES) as (keyof typeof UPGRADES)[]).map(id => {
                const cost = getUpgradeCost(id, state.upgrades[id]);
                const ok = state.mesos >= cost;
                return (
                  <motion.div key={id} className={`isw-card${ok ? " can-afford" : ""}`} whileTap={{ scale: 0.97 }}>
                    <div className="isw-card__name">{UPGRADES[id].name}</div>
                    <div className="isw-card__sub">{getUpgradeEffect(id, state.upgrades[id])}</div>
                    <div className="isw-card__level">Lv.{state.upgrades[id]}</div>
                    <button type="button" className={`isw-card__buy-btn${ok ? " can-afford" : ""}`} onClick={() => onBuyUpgrade(id)}>
                      💰 {formatNumber(cost)}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSection === "training" && (
          <motion.div
            key="training"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            <div className="isw-section-head">
              <span className="isw-section-label">Combat Training</span>
              <motion.button className="isw-section-best" onClick={onBestSkill} whileTap={{ scale: 0.93 }} type="button">
                Best ↑
              </motion.button>
            </div>
            <div className="isw-upgrade-row">
              {(Object.entries(SKILLS) as [keyof typeof SKILLS, typeof SKILLS[keyof typeof SKILLS]][]).map(([id, skill]) => {
                const cost = getSkillCost(id, state.skillLevels[id]);
                const ok = state.fame >= cost;
                return (
                  <motion.div key={id} className={`isw-card${ok ? " can-afford" : ""}`} whileTap={{ scale: 0.97 }}>
                    <div className="isw-card__name">{skill.name}</div>
                    <div className="isw-card__sub">{getSkillEffect(id, state.skillLevels[id])}</div>
                    <div className="isw-card__level">Lv.{state.skillLevels[id]}</div>
                    <button type="button" className={`isw-card__buy-btn${ok ? " can-afford" : ""}`} onClick={() => onTrainSkill(id)}>
                      🏆 {formatNumber(cost)} Fame
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero detail modal */}
      <AnimatePresence>
        {selected && (() => {
          const id = selected;
          const vis = HERO_VISUALS[id];
          const hero = HEROES[id];
          const lv = state.heroLevels[id];
          const cost = getHeroCost(id, lv);
          const canAfford = state.mesos >= cost;
          const cls = CLASSES[vis.classKey];
          return null; // Details are inline expanded; modal kept for future use
          void vis; void hero; void lv; void cost; void canAfford; void cls;
        })()}
      </AnimatePresence>
    </div>
  );
}
