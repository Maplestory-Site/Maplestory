import { useMemo, useState } from "react";
import type { MonsterBossFilter, MonsterDifficultyLabel, MonsterEntry, MonsterLevelRange } from "../../data/monsters";
import {
  defaultMonsterFarmingOptimizerInput,
  getFarmingOptimizerRecommendations,
  type MonsterFarmingGoal
} from "../../lib/monsters";

type MonsterFarmingOptimizerProps = {
  items: MonsterEntry[];
  weaknesses: string[];
  comparedIds: string[];
  onOpen: (item: MonsterEntry) => void;
  onToggleCompare: (item: MonsterEntry) => void;
};

const goalOptions: MonsterFarmingGoal[] = ["Mesos", "Materials", "Easy farm", "High value drops", "Safe farming", "Boss farming"];
const levelOptions: MonsterLevelRange[] = ["All", "1-30", "31-70", "71-120", "121-180", "181+"];
const difficultyOptions: Array<"All" | MonsterDifficultyLabel> = ["All", "Low", "Moderate", "High", "Extreme"];
const bossOptions: MonsterBossFilter[] = ["All", "Bosses", "Non-Bosses"];
const convenienceOptions: Array<"All" | "High" | "Medium" | "Low"> = ["All", "High", "Medium", "Low"];

export function MonsterFarmingOptimizer({
  items,
  weaknesses,
  comparedIds,
  onOpen,
  onToggleCompare
}: MonsterFarmingOptimizerProps) {
  const [input, setInput] = useState(defaultMonsterFarmingOptimizerInput);
  const recommendations = useMemo(() => getFarmingOptimizerRecommendations(items, input), [items, input]);

  function update<K extends keyof typeof input>(key: K, value: (typeof input)[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="monster-optimizer reveal-on-scroll">
      <header className="monster-section-heading">
        <div>
          <span>Farming optimizer</span>
          <h2>Find the best farm fast</h2>
        </div>
        <p>Rank monsters by value, safety, map flow, and drop quality without guessing.</p>
      </header>

      <div className="monster-optimizer__shell">
        <div className="monster-optimizer__controls">
          <div className="monster-optimizer__goal-grid">
            {goalOptions.map((goal) => (
              <button
                key={goal}
                className={`monster-optimizer__goal ${input.goal === goal ? "is-active" : ""}`}
                type="button"
                onClick={() => update("goal", goal)}
              >
                {goal}
              </button>
            ))}
          </div>

          <div className="monster-optimizer__filter-grid">
            <label className="monster-optimizer__field">
              <span>Player level</span>
              <select value={input.level} onChange={(event) => update("level", event.target.value as MonsterLevelRange)}>
                {levelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="monster-optimizer__field">
              <span>Preferred difficulty</span>
              <select
                value={input.difficulty}
                onChange={(event) => update("difficulty", event.target.value as "All" | MonsterDifficultyLabel)}
              >
                {difficultyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="monster-optimizer__field">
              <span>Boss or non-boss</span>
              <select value={input.boss} onChange={(event) => update("boss", event.target.value as MonsterBossFilter)}>
                {bossOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="monster-optimizer__field">
              <span>Map convenience</span>
              <select value={input.mapConvenience} onChange={(event) => update("mapConvenience", event.target.value as "All" | "High" | "Medium" | "Low")}>
                {convenienceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="monster-optimizer__field">
              <span>Weakness</span>
              <select value={input.weakness} onChange={(event) => update("weakness", event.target.value)}>
                <option value="All">All</option>
                {weaknesses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="monster-optimizer__results">
          {recommendations.map((recommendation, index) => {
            const item = recommendation.item;
            const isCompared = comparedIds.includes(item.id);

            return (
              <article key={item.id} className={`monster-mini-tile ${item.isBoss ? "is-boss" : ""}`}>
                <button className="monster-mini-tile__open" type="button" onClick={() => onOpen(item)}>
                  <div className="monster-mini-tile__frame">
                    <div className="monster-mini-tile__art">
                      {item.image ? <img alt={item.name} loading="lazy" src={item.image} /> : <span className="monster-mini-tile__glyph">{item.portrait}</span>}
                    </div>
                  </div>

                  <div className="monster-mini-tile__copy">
                    <strong>{item.name}</strong>
                    <span>Lv. {item.level}</span>
                  </div>

                  <div className="monster-mini-tile__flags">
                    <span>{index === 0 ? "BEST" : recommendation.badge}</span>
                  </div>
                </button>

                <div className="monster-mini-tile__actions">
                  <button
                    className={`monster-mini-tile__compare ${isCompared ? "is-active" : ""}`}
                    type="button"
                    onClick={() => onToggleCompare(item)}
                  >
                    {isCompared ? "Added" : "Compare"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
