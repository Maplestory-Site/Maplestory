import { useEffect } from "react";
import type { MonsterDrop, MonsterEntry, MonsterLocation } from "../../data/monsters";
import { formatMonsterHp, getMonsterScoreProfile } from "../../lib/monsters";

type MonsterCompareModalProps = {
  items: MonsterEntry[];
  onClose: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
};

type ComparisonTone = "best" | "worst" | "neutral";

function getNumericTone(value: number, values: number[], highestWins = true): ComparisonTone {
  const uniqueValues = Array.from(new Set(values));
  if (uniqueValues.length <= 1) return "neutral";
  const best = highestWins ? Math.max(...values) : Math.min(...values);
  const worst = highestWins ? Math.min(...values) : Math.max(...values);
  if (value === best) return "best";
  if (value === worst) return "worst";
  return "neutral";
}

function summarizeDrops(drops: MonsterDrop[]) {
  return drops.map((drop) => `${drop.name} (${drop.rarity})`);
}

function summarizeLocations(locations: MonsterLocation[]) {
  return locations.map((location) => `${location.region} - ${location.map}`);
}

function getDropTone(item: MonsterEntry, items: MonsterEntry[]): ComparisonTone {
  const values = items.map((monster) => monster.drops.length);
  return getNumericTone(item.drops.length, values);
}

function getWeaknessTone(item: MonsterEntry, items: MonsterEntry[]): ComparisonTone {
  const values = items.map((monster) => monster.weaknesses.length);
  return getNumericTone(item.weaknesses.length, values, false);
}

function getLocationTone(item: MonsterEntry, items: MonsterEntry[]): ComparisonTone {
  const values = items.map((monster) => monster.locations.length);
  return getNumericTone(item.locations.length, values, false);
}

function getBestChoice(item: MonsterEntry, items: MonsterEntry[]) {
  const topFarm = Math.max(...items.map((monster) => monster.farmingScore));
  if (item.farmingScore === topFarm) return "Best farm";
  if (item.isBoss) return "Boss focus";
  if (item.difficulty <= 35) return "Easy route";
  return null;
}

export function MonsterCompareModal({ items, onClose, onClear, onRemove }: MonsterCompareModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (items.length < 2) return null;

  const hpValues = items.map((item) => item.hp);
  const strengthValues = items.map((item) => item.strength);
  const difficultyValues = items.map((item) => item.difficulty);
  const farmingValues = items.map((item) => item.farmingScore);
  const scoreProfiles = items.map((item) => ({ item, profile: getMonsterScoreProfile(item) }));
  const farmScoreValues = scoreProfiles.map(({ profile }) => profile.farmingScore.value);
  const beginnerValues = scoreProfiles.map(({ profile }) => profile.beginnerFriendlinessScore.value);
  const threatValues = scoreProfiles.map(({ profile }) => profile.bossThreatScore.value);
  const dropValues = scoreProfiles.map(({ profile }) => profile.dropValueScore.value);

  return (
    <div aria-hidden={false} className="monster-compare-modal" onClick={onClose} role="presentation">
      <div
        aria-labelledby="monster-compare-title"
        aria-modal="true"
        className="monster-compare-modal__panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="monster-compare-modal__head">
          <div>
            <span>Monster comparison</span>
            <h2 id="monster-compare-title">See the best target fast</h2>
            <p>Compare farming value, drops, weaknesses, and route quality side by side.</p>
          </div>

          <div className="monster-compare-modal__actions">
            <button className="monster-compare-modal__utility" type="button" onClick={onClear}>
              Clear all
            </button>
            <button className="monster-compare-modal__utility" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="monster-compare-modal__body">
          {scoreProfiles.map(({ item, profile }) => (
            <article key={item.id} className="monster-compare-modal__column">
              <div className="monster-compare-modal__hero">
                <div className="monster-compare-modal__art">
                  {item.image ? <img alt={item.name} loading="lazy" src={item.image} /> : <span>{item.portrait}</span>}
                </div>

                <div className="monster-compare-modal__monster-head">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.shortDescription}</p>
                  </div>
                  <button className="monster-compare-modal__remove" type="button" onClick={() => onRemove(item.id)}>
                    Remove
                  </button>
                </div>

                <div className="monster-compare-modal__badges">
                  <span className="monster-card__badge">Lv. {item.level}</span>
                  <span className="monster-card__badge">{item.type}</span>
                  {item.isBoss ? <span className="monster-card__badge monster-card__badge--boss">Boss</span> : null}
                  {item.isElite ? <span className="monster-card__badge">Elite</span> : null}
                  {getBestChoice(item, items) ? (
                    <span className="monster-card__badge monster-card__badge--farm">{getBestChoice(item, items)}</span>
                  ) : null}
                </div>
              </div>

              <section className="monster-compare-modal__section">
                <div className="monster-compare-modal__section-head">
                  <span>Basic stats</span>
                </div>
                <div className="monster-compare-modal__metrics">
                  <div className={`monster-compare-modal__metric is-${getNumericTone(item.hp, hpValues)}`}>
                    <label>HP</label>
                    <strong>{formatMonsterHp(item.hp)}</strong>
                  </div>
                  <div className={`monster-compare-modal__metric is-${getNumericTone(item.strength, strengthValues)}`}>
                    <label>Strength</label>
                    <strong>{item.strength}</strong>
                  </div>
                  <div
                    className={`monster-compare-modal__metric is-${getNumericTone(
                      item.difficulty,
                      difficultyValues,
                      false
                    )}`}
                  >
                    <label>Difficulty</label>
                    <strong>{item.difficultyLabel}</strong>
                  </div>
                  <div className={`monster-compare-modal__metric is-${getNumericTone(item.farmingScore, farmingValues)}`}>
                    <label>Farming</label>
                    <strong>{item.farmingScore}</strong>
                  </div>
                </div>
              </section>

              <section className="monster-compare-modal__section">
                <div className="monster-compare-modal__section-head">
                  <span>Smart scores</span>
                </div>
                <div className="monster-compare-modal__metrics">
                  <div className={`monster-compare-modal__metric is-${getNumericTone(profile.farmingScore.value, farmScoreValues)}`}>
                    <label>Farm</label>
                    <strong>{profile.farmingScore.value}</strong>
                  </div>
                  <div className={`monster-compare-modal__metric is-${getNumericTone(profile.dropValueScore.value, dropValues)}`}>
                    <label>Drops</label>
                    <strong>{profile.dropValueScore.value}</strong>
                  </div>
                  <div className={`monster-compare-modal__metric is-${getNumericTone(profile.beginnerFriendlinessScore.value, beginnerValues)}`}>
                    <label>Beginner</label>
                    <strong>{profile.beginnerFriendlinessScore.value}</strong>
                  </div>
                  <div className={`monster-compare-modal__metric is-${getNumericTone(profile.bossThreatScore.value, threatValues)}`}>
                    <label>Threat</label>
                    <strong>{profile.bossThreatScore.value}</strong>
                  </div>
                </div>
                <div className="monster-compare-modal__insight monster-compare-modal__insight--compact">
                  <strong>{profile.farmingScore.reasons[0]}</strong>
                  <p>{profile.beginnerFriendlinessScore.reasons[0]}</p>
                </div>
              </section>

              <section className="monster-compare-modal__section">
                <div className="monster-compare-modal__section-head">
                  <span>Weaknesses</span>
                  <small className={`is-${getWeaknessTone(item, items)}`}>{item.weaknesses.length} tags</small>
                </div>
                <div className="monster-compare-modal__tag-list">
                  {item.weaknesses.map((weakness) => (
                    <span key={weakness} className="monster-compare-modal__tag">
                      {weakness}
                    </span>
                  ))}
                </div>
              </section>

              <section className="monster-compare-modal__section">
                <div className="monster-compare-modal__section-head">
                  <span>Drops</span>
                  <small className={`is-${getDropTone(item, items)}`}>{item.drops.length} listed</small>
                </div>
                <div className="monster-compare-modal__list">
                  {summarizeDrops(item.drops).map((drop) => (
                    <div key={drop} className="monster-compare-modal__list-item">
                      {drop}
                    </div>
                  ))}
                </div>
              </section>

              <section className="monster-compare-modal__section">
                <div className="monster-compare-modal__section-head">
                  <span>Location</span>
                  <small className={`is-${getLocationTone(item, items)}`}>{item.locations.length} routes</small>
                </div>
                <div className="monster-compare-modal__list">
                  {summarizeLocations(item.locations).map((location) => (
                    <div key={location} className="monster-compare-modal__list-item">
                      {location}
                    </div>
                  ))}
                </div>
              </section>

              <section className="monster-compare-modal__section">
                <div className="monster-compare-modal__section-head">
                  <span>Farm read</span>
                </div>
                <div className="monster-compare-modal__insight">
                  <strong>{item.farmingTier} farming target</strong>
                  <p>{item.farmingReason}</p>
                </div>
              </section>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
