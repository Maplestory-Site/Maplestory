import { Button } from "../ui/Button";
import type { MonsterEntry } from "../../data/monsters";
import { formatMonsterHp, getMonsterScoreProfile } from "../../lib/monsters";
import { MonsterStatBar } from "./MonsterStatBar";
import { useI18n } from "../../i18n/I18nProvider";

type MonsterDetailsPanelProps = {
  item: MonsterEntry | null;
  compared: boolean;
  onClose: () => void;
  onSearchDrop: (dropName: string) => void;
  onToggleCompare: (item: MonsterEntry) => void;
};

export function MonsterDetailsPanel({ item, compared, onClose, onSearchDrop, onToggleCompare }: MonsterDetailsPanelProps) {
  const { t, td } = useI18n();
  if (!item) return null;
  const scoreProfile = getMonsterScoreProfile(item);

  return (
    <div className="monster-details" onClick={onClose} role="presentation">
      <div className="monster-details__panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <button aria-label={t("Close monster details")} className="monster-details__close" type="button" onClick={onClose}>
          {t("Close")}
        </button>

        <div className="monster-details__hero">
          <div className="monster-details__art">
            {item.image ? <img alt={td(item.name)} src={item.image} /> : <span>{item.portrait}</span>}
          </div>

          <div className="monster-details__copy">
            <div className="monster-details__badges">
              <span className="monster-card__badge">{td(item.type)}</span>
              {item.isBoss ? <span className="monster-card__badge monster-card__badge--boss">{t("Boss")}</span> : null}
              {item.isElite ? <span className="monster-card__badge">{t("Elite")}</span> : null}
            </div>

            <h2>{td(item.name)}</h2>
            <p>{td(item.description)}</p>

            <div className="monster-details__meta">
              <span>{td(`Lv. ${item.level}`)}</span>
              <span>{td(`HP ${formatMonsterHp(item.hp)}`)}</span>
              <span>{td(item.category)}</span>
              <span>{td(item.difficultyLabel)}</span>
            </div>
          </div>
        </div>

        <div className="monster-details__stats">
          <MonsterStatBar label={t("Farm score")} tone="farm" value={scoreProfile.farmingScore.value} />
          <MonsterStatBar label={t("Drop value")} tone="strength" value={scoreProfile.dropValueScore.value} />
          <MonsterStatBar label={t("Threat")} tone="difficulty" value={scoreProfile.bossThreatScore.value} />
          <MonsterStatBar label={t("Beginner")} tone="hp" value={scoreProfile.beginnerFriendlinessScore.value} />
        </div>

        <div className="monster-details__grid">
          <section>
            <span className="monster-details__label">{t("Smart score read")}</span>
            <div className="monster-details__score-grid">
              <div className="monster-details__info-card monster-details__score-card">
                <strong>{t("Farm score")} {scoreProfile.farmingScore.value}</strong>
                <p>{td(scoreProfile.farmingScore.reasons[0])}</p>
              </div>
              <div className="monster-details__info-card monster-details__score-card">
                <strong>{t("Beginner")} {scoreProfile.beginnerFriendlinessScore.value}</strong>
                <p>{td(scoreProfile.beginnerFriendlinessScore.reasons[0])}</p>
              </div>
              <div className="monster-details__info-card monster-details__score-card">
                <strong>{t("Drop value")} {scoreProfile.dropValueScore.value}</strong>
                <p>{td(scoreProfile.dropValueScore.reasons[0])}</p>
              </div>
              <div className="monster-details__info-card monster-details__score-card">
                <strong>{t("Threat")} {scoreProfile.bossThreatScore.value}</strong>
                <p>{td(scoreProfile.bossThreatScore.reasons[0])}</p>
              </div>
            </div>
          </section>

          <section>
            <span className="monster-details__label">{t("Weaknesses")}</span>
            <div className="monster-details__chips">
              {item.weaknesses.map((weakness) => (
                <span key={weakness} className="monster-details__chip">
                  {td(weakness)}
                </span>
              ))}
            </div>
          </section>

          <section>
            <span className="monster-details__label">{t("Where to find")}</span>
            <div className="monster-details__stack">
              {item.locations.map((location) => (
                <div key={`${location.region}-${location.map}`} className="monster-details__info-card">
                  <strong>{td(location.map)}</strong>
                  <span>{td(location.region)}</span>
                  {location.area ? <span>{td(location.area)}</span> : null}
                </div>
              ))}
            </div>
          </section>

          <section>
            <span className="monster-details__label">{t("Drops")}</span>
            <div className="monster-details__stack">
              {item.drops.map((drop) => (
                <div key={drop.name} className="monster-details__info-card">
                  <strong>{td(drop.name)}</strong>
                  <span>{td(drop.kind)}</span>
                  <span>{td(drop.rarity)}</span>
                  <button className="monster-details__search-drop" type="button" onClick={() => onSearchDrop(drop.name)}>
                    {t("Search similar drops")}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <span className="monster-details__label">{t("Farm read")}</span>
            <div className="monster-details__info-card">
              <strong>{td(`${item.farmingTier} farming target`)}</strong>
              <p>{td(item.farmingReason)}</p>
              <div className="monster-details__score-reasons">
                {scoreProfile.accessibilityScore.reasons.slice(0, 2).map((reason) => (
                  <span key={reason} className="monster-details__reason-pill">
                    {td(reason)}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="monster-details__actions">
          <Button onClick={() => onToggleCompare(item)} variant={compared ? "secondary" : "primary"}>
            {compared ? t("Remove from compare") : t("Add to compare")}
          </Button>
          <Button href="/videos" variant="secondary">
            {t("Related Guides")}
          </Button>
          <Button href="/classes" variant="ghost">
            {t("Compare Builds")}
          </Button>
        </div>
      </div>
    </div>
  );
}
