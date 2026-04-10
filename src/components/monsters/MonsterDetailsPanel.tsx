import { Button } from "../ui/Button";
import type { MonsterEntry } from "../../data/monsters";
import { formatMonsterHp, getMonsterScoreProfile } from "../../lib/monsters";
import { MonsterStatBar } from "./MonsterStatBar";

type MonsterDetailsPanelProps = {
  item: MonsterEntry | null;
  compared: boolean;
  onClose: () => void;
  onSearchDrop: (dropName: string) => void;
  onToggleCompare: (item: MonsterEntry) => void;
};

export function MonsterDetailsPanel({ item, compared, onClose, onSearchDrop, onToggleCompare }: MonsterDetailsPanelProps) {
  if (!item) return null;
  const scoreProfile = getMonsterScoreProfile(item);

  return (
    <div className="monster-details" onClick={onClose} role="presentation">
      <div className="monster-details__panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <button aria-label="Close monster details" className="monster-details__close" type="button" onClick={onClose}>
          Close
        </button>

        <div className="monster-details__hero">
          <div className="monster-details__art">
            {item.image ? <img alt={item.name} src={item.image} /> : <span>{item.portrait}</span>}
          </div>

          <div className="monster-details__copy">
            <div className="monster-details__badges">
              <span className="monster-card__badge">{item.type}</span>
              {item.isBoss ? <span className="monster-card__badge monster-card__badge--boss">Boss</span> : null}
              {item.isElite ? <span className="monster-card__badge">Elite</span> : null}
            </div>

            <h2>{item.name}</h2>
            <p>{item.description}</p>

            <div className="monster-details__meta">
              <span>Lv. {item.level}</span>
              <span>HP {formatMonsterHp(item.hp)}</span>
              <span>{item.category}</span>
              <span>{item.difficultyLabel}</span>
            </div>
          </div>
        </div>

        <div className="monster-details__stats">
          <MonsterStatBar label="Farm score" tone="farm" value={scoreProfile.farmingScore.value} />
          <MonsterStatBar label="Drop value" tone="strength" value={scoreProfile.dropValueScore.value} />
          <MonsterStatBar label="Threat" tone="difficulty" value={scoreProfile.bossThreatScore.value} />
          <MonsterStatBar label="Beginner" tone="hp" value={scoreProfile.beginnerFriendlinessScore.value} />
        </div>

        <div className="monster-details__grid">
          <section>
            <span className="monster-details__label">Smart score read</span>
            <div className="monster-details__score-grid">
              <div className="monster-details__info-card monster-details__score-card">
                <strong>Farm score {scoreProfile.farmingScore.value}</strong>
                <p>{scoreProfile.farmingScore.reasons[0]}</p>
              </div>
              <div className="monster-details__info-card monster-details__score-card">
                <strong>Beginner {scoreProfile.beginnerFriendlinessScore.value}</strong>
                <p>{scoreProfile.beginnerFriendlinessScore.reasons[0]}</p>
              </div>
              <div className="monster-details__info-card monster-details__score-card">
                <strong>Drop value {scoreProfile.dropValueScore.value}</strong>
                <p>{scoreProfile.dropValueScore.reasons[0]}</p>
              </div>
              <div className="monster-details__info-card monster-details__score-card">
                <strong>Threat {scoreProfile.bossThreatScore.value}</strong>
                <p>{scoreProfile.bossThreatScore.reasons[0]}</p>
              </div>
            </div>
          </section>

          <section>
            <span className="monster-details__label">Weaknesses</span>
            <div className="monster-details__chips">
              {item.weaknesses.map((weakness) => (
                <span key={weakness} className="monster-details__chip">
                  {weakness}
                </span>
              ))}
            </div>
          </section>

          <section>
            <span className="monster-details__label">Where to find</span>
            <div className="monster-details__stack">
              {item.locations.map((location) => (
                <div key={`${location.region}-${location.map}`} className="monster-details__info-card">
                  <strong>{location.map}</strong>
                  <span>{location.region}</span>
                  {location.area ? <span>{location.area}</span> : null}
                </div>
              ))}
            </div>
          </section>

          <section>
            <span className="monster-details__label">Drops</span>
            <div className="monster-details__stack">
              {item.drops.map((drop) => (
                <div key={drop.name} className="monster-details__info-card">
                  <strong>{drop.name}</strong>
                  <span>{drop.kind}</span>
                  <span>{drop.rarity}</span>
                  <button className="monster-details__search-drop" type="button" onClick={() => onSearchDrop(drop.name)}>
                    Search similar drops
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <span className="monster-details__label">Farm read</span>
            <div className="monster-details__info-card">
              <strong>{item.farmingTier} farming target</strong>
              <p>{item.farmingReason}</p>
              <div className="monster-details__score-reasons">
                {scoreProfile.accessibilityScore.reasons.slice(0, 2).map((reason) => (
                  <span key={reason} className="monster-details__reason-pill">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="monster-details__actions">
          <Button onClick={() => onToggleCompare(item)} variant={compared ? "secondary" : "primary"}>
            {compared ? "Remove from compare" : "Add to compare"}
          </Button>
          <Button href="/videos" variant="secondary">
            Related Guides
          </Button>
          <Button href="/classes" variant="ghost">
            Compare Builds
          </Button>
        </div>
      </div>
    </div>
  );
}
