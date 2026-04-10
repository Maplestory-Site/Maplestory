import { useMemo, useState } from "react";
import type { MonsterBossFilter, MonsterDifficultyLabel, MonsterEntry, MonsterLevelRange } from "../../data/monsters";
import {
  defaultMonsterRecommendationInput,
  getMonsterRecommendations,
  type MonsterRecommendationGoal
} from "../../lib/monsters";

type MonsterRecommendationAssistantProps = {
  items: MonsterEntry[];
  regions: string[];
  weaknesses: string[];
  onOpen: (item: MonsterEntry) => void;
};

const goalOptions: MonsterRecommendationGoal[] = ["Farming", "Easy hunting", "Drops", "Challenge"];
const levelOptions: MonsterLevelRange[] = ["All", "1-30", "31-70", "71-120", "121-180", "181+"];
const difficultyOptions: Array<"All" | MonsterDifficultyLabel> = ["All", "Low", "Moderate", "High", "Extreme"];
const bossOptions: MonsterBossFilter[] = ["All", "Bosses", "Non-Bosses"];

export function MonsterRecommendationAssistant({
  items,
  regions,
  weaknesses,
  onOpen
}: MonsterRecommendationAssistantProps) {
  const [input, setInput] = useState(defaultMonsterRecommendationInput);

  const recommendations = useMemo(() => getMonsterRecommendations(items, input, 10), [input, items]);

  function update<K extends keyof typeof input>(key: K, value: (typeof input)[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="monster-recommendation reveal-on-scroll">
      <header className="monster-section-heading">
        <div>
          <span>Smart assistant</span>
          <h2>Find the best monster for the job</h2>
        </div>
        <p>Pick a goal and tap a monster tile to open the full stats.</p>
      </header>

      <div className="monster-recommendation__shell">
        <div className="monster-recommendation__controls">
          <div className="monster-recommendation__goal-grid">
            {goalOptions.map((goal) => (
              <button
                key={goal}
                className={`monster-recommendation__goal ${input.goal === goal ? "is-active" : ""}`}
                type="button"
                onClick={() => update("goal", goal)}
              >
                {goal}
              </button>
            ))}
          </div>

          <div className="monster-recommendation__filter-grid">
            <label className="monster-recommendation__field">
              <span>Level range</span>
              <select value={input.level} onChange={(event) => update("level", event.target.value as MonsterLevelRange)}>
                {levelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="monster-recommendation__field">
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

            <label className="monster-recommendation__field">
              <span>Boss or non-boss</span>
              <select value={input.boss} onChange={(event) => update("boss", event.target.value as MonsterBossFilter)}>
                {bossOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="monster-recommendation__field">
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

            <label className="monster-recommendation__field">
              <span>Region</span>
              <select value={input.region} onChange={(event) => update("region", event.target.value)}>
                <option value="All">All</option>
                {regions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="monster-recommendation__results">
          {recommendations.map((recommendation, index) => {
            const item = recommendation.item;

            return (
              <button
                key={item.id}
                aria-label={`Open ${item.name} details`}
                className={`monster-recommendation__tile ${index === 0 ? "is-top" : ""}`}
                type="button"
                onClick={() => onOpen(item)}
              >
                <div className="monster-recommendation__tile-badge">
                  <span>{index === 0 ? "Best" : "Pick"}</span>
                </div>

                <div className="monster-recommendation__tile-art">
                  {item.image ? <img alt={item.name} loading="lazy" src={item.image} /> : <span>{item.portrait}</span>}
                </div>

                <div className="monster-recommendation__tile-copy">
                  <strong>{item.name}</strong>
                  <span>Lv. {item.level}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
