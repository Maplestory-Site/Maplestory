import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { LibraryIcon } from "../content/LibraryIcon";
import {
  filterClasses,
  libraryClassGroups,
  type LibraryClass,
  type LibraryClassGroup
} from "../../data/libraryClasses";
import { getSkillIconsForClass, librarySkillIconSections, type LibrarySkillIconEntry } from "../../data/librarySkillIcons";
import { SkillVideoModal } from "./SkillVideoModal";
import "../../styles/skill-video-modal.css";

const ratingLabels: Array<{ key: keyof Pick<LibraryClass, "mobbing" | "bossing" | "mobility" | "survivability">; label: string }> = [
  { key: "mobbing", label: "Mobbing" },
  { key: "bossing", label: "Bossing" },
  { key: "mobility", label: "Mobility" },
  { key: "survivability", label: "Survival" }
];

type LibraryClassBrowserProps = {
  selectedClassId?: string;
  onSelectClass?: (classId: string) => void;
};

function SkillIcon({ skill, onSelect }: { skill: LibrarySkillIconEntry; onSelect?: (skill: LibrarySkillIconEntry) => void }) {
  const accessibleLabel = [skill.label, skill.cooldownLabel, skill.metaLabel].filter(Boolean).join(" ");
  const handleIconError = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied === "true") return;
    image.dataset.fallbackApplied = "true";
    image.src = skill.localFallback;
  };

  // Render as a button so clicking opens the inline preview modal (no redirect).
  return (
    <button
      aria-label={accessibleLabel}
      className={`library-skill-token library-skill-token--${skill.type}`}
      onClick={() => onSelect?.(skill)}
      title={skill.description}
      type="button"
    >
      <img alt="" decoding="async" loading="lazy" onError={handleIconError} src={skill.icon} />
      <span className="library-skill-token__name">{skill.label}</span>
      {skill.cooldownLabel ? <span className="library-skill-token__cooldown">{skill.cooldownLabel}</span> : null}
      {skill.metaLabel ? <span className="library-skill-token__meta">{skill.metaLabel}</span> : null}
    </button>
  );
}

function handleClassImageError(event: SyntheticEvent<HTMLImageElement>, fallbackImage: string) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === "true") return;
  image.dataset.fallbackApplied = "true";
  image.src = fallbackImage || "/library/classes.svg";
}

export function LibraryClassBrowser({ selectedClassId, onSelectClass }: LibraryClassBrowserProps = {}) {
  const [previewSkill, setPreviewSkill] = useState<LibrarySkillIconEntry | null>(null);
  const [group, setGroup] = useState<LibraryClassGroup | null>(null);
  const [query, setQuery] = useState("");
  const classes = useMemo(() => filterClasses({ group, query }), [group, query]);
  const [selectedId, setSelectedId] = useState(selectedClassId ?? "bishop");
  const selected = classes.find((cls) => cls.id === selectedId) ?? classes[0] ?? null;
  const skillIcons = selected ? getSkillIconsForClass(selected.id) : null;

  useEffect(() => {
    if (selectedClassId) {
      setSelectedId(selectedClassId);
    }
  }, [selectedClassId]);

  const handleSelectClass = (classId: string) => {
    setSelectedId(classId);
    onSelectClass?.(classId);
  };

  return (
    <section className="library-class-browser" aria-labelledby="library-class-browser-title">
      <div className="library-class-browser__head">
        <div>
          <span className="library-eyebrow">Class Library</span>
          <h2 id="library-class-browser-title">Browse classes by identity, kit, and skills.</h2>
          <p>
            Compare class properties, role flavor, ratings, link skills, Legion value, and visual skill groups in a
            guide-style browser.
          </p>
        </div>
        <label className="library-class-browser__search">
          <span>Search class</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hero, mage, boss, support..."
            type="search"
            value={query}
          />
        </label>
      </div>

      <div className="library-class-browser__groups" aria-label="Class groups">
        <button className={!group ? "is-active" : ""} onClick={() => setGroup(null)} type="button">
          All
        </button>
        {libraryClassGroups.map((item) => (
          <button
            className={group === item ? "is-active" : ""}
            key={item}
            onClick={() => setGroup(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="library-class-browser__layout">
        <div className="library-class-browser__grid" aria-label="Class cards">
          {classes.map((cls) => (
            <button
              className={`library-class-card ${selected?.id === cls.id ? "is-active" : ""}`}
              key={cls.id}
              onClick={() => handleSelectClass(cls.id)}
              style={{ ["--class-accent" as string]: cls.visualTheme.accent }}
              type="button"
            >
              <span className="library-class-card__banner" style={{ background: cls.visualTheme.gradient }}>
                <img
                  alt=""
                  decoding="async"
                  loading="lazy"
                  onError={(event) => handleClassImageError(event, cls.heroImage)}
                  src={cls.cardImage}
                />
                <span className="library-class-card__icon">
                  <LibraryIcon name={cls.iconKey} size={22} />
                </span>
              </span>
              <span className="library-class-card__body">
                <strong>{cls.name}</strong>
                <small>{cls.classGroup} - {cls.jobGroup}</small>
                <span>{cls.role}</span>
              </span>
            </button>
          ))}
        </div>

        {selected && skillIcons ? (
          <article className="library-class-detail library-class-detail--grandis card">
            <div className="library-class-detail__columns">
              <aside className="library-class-detail__left">
                <section className="library-class-title-card">
                  <div className="library-class-title-card__icon" style={{ background: selected.visualTheme.gradient }}>
                    <LibraryIcon name={selected.iconKey} size={30} />
                  </div>
                  <div>
                    <span className="library-eyebrow">{selected.classGroup} / {selected.jobGroup}</span>
                    <h3>{selected.name}</h3>
                    <p>{selected.role} - {selected.style}</p>
                  </div>
                </section>

                <section>
                  <h4>Class Properties</h4>
                  <dl className="library-class-properties">
                    <div><dt>Class Group</dt><dd>{selected.classGroup}</dd></div>
                    <div><dt>Job Group</dt><dd>{selected.jobGroup}</dd></div>
                    <div><dt>Primary Stat</dt><dd>{selected.primaryStat}</dd></div>
                    <div><dt>Secondary Stat</dt><dd>{selected.secondaryStat}</dd></div>
                    <div><dt>Primary Weapon</dt><dd>{selected.weapon}</dd></div>
                    <div><dt>Secondary Weapon</dt><dd>{selected.secondaryWeapon}</dd></div>
                    <div><dt>Legion Bonus</dt><dd>{selected.legionBonus}</dd></div>
                  </dl>
                </section>

                <section>
                  <h4>Skill Preview <span aria-hidden="true">i</span></h4>
                  <div className="library-skill-preview-row">
                    {skillIcons.skillPreviewIcons.map((skill) => (
                      <SkillIcon key={skill.id} onSelect={setPreviewSkill} skill={skill} />
                    ))}
                  </div>
                </section>

              </aside>

              <div className="library-class-detail__right">
                <section className="library-class-overview-card">
                  <div>
                    <span className="library-eyebrow">Class Overview</span>
                    <h3>{selected.name}</h3>
                    <p>{selected.audience}</p>
                  </div>
                  <div className="library-class-ratings">
                    {ratingLabels.map((rating) => (
                      <div key={rating.key}>
                        <span>{rating.label}</span>
                        <strong>{selected[rating.key]}/5</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="library-active-table" aria-labelledby="library-active-table-title">
                  <h4 id="library-active-table-title">All Actives <span aria-hidden="true">i</span></h4>
                  {librarySkillIconSections
                    .filter((section) => skillIcons[section.key].length > 0)
                    .map((section) => (
                      <div className="library-active-row" key={section.key}>
                        <strong>{section.label}:</strong>
                        <div className="library-active-row__icons">
                          {skillIcons[section.key].map((skill) => (
                            <SkillIcon key={skill.id} onSelect={setPreviewSkill} skill={skill} />
                          ))}
                        </div>
                      </div>
                    ))}
                </section>

                <section className="library-class-summary library-class-summary--compact">
                  <div>
                    <strong>Pros</strong>
                    <ul>{selected.pros.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <strong>Cons</strong>
                    <ul>{selected.cons.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </section>
              </div>
            </div>
          </article>
        ) : (
          <div className="content-empty-state card library-empty-state">
            <strong>No classes match that search.</strong>
            <p>Clear the query or choose another class group.</p>
          </div>
        )}
      </div>
    
      <SkillVideoModal
        className={selected ? selected.name : undefined}
        onClose={() => setPreviewSkill(null)}
        skill={previewSkill}
      />
    </section>
  );
}
