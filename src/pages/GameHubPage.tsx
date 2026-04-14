import { useMemo, useRef, useState } from "react";
import { miniGames } from "../data/miniGames";
import type { MiniGameId } from "../data/miniGames";
import { MiniGamesModal } from "../components/content/MiniGamesModal";
import { getDailyChallenge } from "../components/content/minigames/shared/dailyChallenge";
import { useGameMeta } from "../components/content/minigames/shared/useGameMeta";
import { useGameFavorites } from "../components/content/minigames/shared/gameFavorites";
import { ProgressBar } from "../components/content/minigames/shared/ProgressBar";
import { getAchievementLabel, getProgressSnapshot, openLootBox, purchaseShopItem, type LootReward } from "../components/content/minigames/shared/gameMeta";

export function GameHubPage() {
  const [open, setOpen] = useState(false);
  const [activeGameId, setActiveGameId] = useState<MiniGameId>("reaction-test");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const meta = useGameMeta();
  const daily = getDailyChallenge();
  const { favorites, toggle } = useGameFavorites();
  const progress = useMemo(() => getProgressSnapshot(meta), [meta]);

  const categoryMap = useMemo(
    (): Record<string, string[]> => ({
      Arcade: ["Arcade", "Runner", "Reflex"],
      Reaction: ["Timing", "Reflex"],
      Skill: ["Accuracy", "Precision"],
      Puzzle: ["Puzzle", "Memory"],
      Casual: ["Training", "Boss", "Survival", "Pressure"]
    }),
    []
  );

  const categories = useMemo(() => ["All", ...Object.keys(categoryMap)], [categoryMap]);

  const filteredGames = useMemo(() => {
    const term = search.trim().toLowerCase();
    return miniGames.filter((game) => {
      const matchesTerm =
        !term ||
        game.title.toLowerCase().includes(term) ||
        game.description.toLowerCase().includes(term) ||
        game.type.toLowerCase().includes(term);
      const matchesCategory =
        activeCategory === "All" ||
        (categoryMap[activeCategory] ?? []).some((label) => label.toLowerCase() === game.type.toLowerCase());
      return matchesTerm && matchesCategory;
    });
  }, [activeCategory, categoryMap, search]);

  const gamesByCategory = useMemo(() => {
    const result: Record<string, typeof miniGames> = {};
    Object.entries(categoryMap).forEach(([category, labels]) => {
      result[category] = filteredGames.filter((game) =>
        labels.some((label) => label.toLowerCase() === game.type.toLowerCase())
      );
    });
    return result;
  }, [categoryMap, filteredGames]);

  const mostPlayed = useMemo(() => {
    const entries = Object.entries(meta.gamePlays ?? {}) as [MiniGameId, number][];
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => miniGames.find((game) => game.id === id))
      .filter(Boolean)
      .slice(0, 4) as typeof miniGames;
  }, [meta.gamePlays]);

  const mostPlayedGame = useMemo(() => {
    const entries = Object.entries(meta.gamePlays ?? {}) as [MiniGameId, number][];
    const top = entries.sort((a, b) => b[1] - a[1])[0]?.[0];
    return miniGames.find((game) => game.id === (top ?? "reaction-test")) ?? miniGames[0];
  }, [meta.gamePlays]);

  const featured = useMemo(
    () => miniGames.find((game) => game.id === daily.challenge.gameId) ?? miniGames[0],
    [daily.challenge.gameId]
  );

  const favoriteGames = miniGames.filter((game) => favorites.includes(game.id));
  const dailyMissions = meta.dailyMissions.missions;
  const dailyCompleteCount = dailyMissions.filter((mission) => mission.completed).length;
  const dailyTotal = dailyMissions.length || 3;
  const topAchievements = meta.achievements.slice(0, 6);
  const [shopMessage, setShopMessage] = useState<string | null>(null);
  const [lootReward, setLootReward] = useState<LootReward | null>(null);
  const [isOpeningLoot, setIsOpeningLoot] = useState(false);

  const shopItems = useMemo(
    () => [
      {
        id: "theme-ember",
        name: "Ember Glow Theme",
        type: "Theme",
        price: 220,
        preview: "Warm, molten UI gradients across the game shell."
      },
      {
        id: "ui-pulse",
        name: "Pulse Trail FX",
        type: "UI Effect",
        price: 180,
        preview: "Adds a glowing pulse to score pops and combos."
      },
      {
        id: "avatar-slayer",
        name: "Slayer Crest Avatar",
        type: "Avatar",
        price: 140,
        preview: "A premium crest icon for your player card."
      },
      {
        id: "skin-neo",
        name: "Neo Skin Pack",
        type: "Skin",
        price: 260,
        preview: "Crisp neon highlights for select mini-games."
      }
    ],
    []
  );

  const handlePurchase = (itemId: string, price: number) => {
    const result = purchaseShopItem(itemId, price);
    if (!result.ok) {
      setShopMessage(result.reason === "coins" ? "Not enough coins yet." : "Already owned.");
      window.setTimeout(() => setShopMessage(null), 1800);
      return;
    }
    setShopMessage("Purchase complete!");
    window.setTimeout(() => setShopMessage(null), 1400);
  };

  const openBox = () => {
    if (isOpeningLoot || meta.lootBoxes <= 0) return;
    setIsOpeningLoot(true);
    const reward = openLootBox();
    if (reward) {
      setLootReward(reward);
    }
    window.setTimeout(() => setIsOpeningLoot(false), 900);
    window.setTimeout(() => setLootReward(null), 2600);
  };

  const rewardLabel = lootReward
    ? lootReward.type === "coins"
      ? `${lootReward.amount} coins`
      : shopItems.find((item) => item.id === lootReward.itemId)?.name ?? "Exclusive reward"
    : null;

  return (
    <>
      <section className="game-hub">
        <div className="container">
          <div className="game-hub__hero card" data-reveal>
            <div className="game-hub__hero-copy">
              <span className="section-header__eyebrow">Game Hub</span>
              <h1>Arcade-ready. Mobile-first. Built to replay.</h1>
              <p>Discover premium mini games, track your best runs, and dive back in instantly.</p>
              <div className="game-hub__hero-actions">
                <button
                  className="button button--primary"
                  onClick={() => {
                    setActiveGameId(featured.id);
                    setOpen(true);
                  }}
                  type="button"
                >
                  Play {featured.title}
                </button>
                <button
                  className="button button--ghost"
                  onClick={() => {
                    setActiveGameId(mostPlayedGame.id);
                    setOpen(true);
                  }}
                  type="button"
                >
                  Play this next
                </button>
                <button className="button button--ghost" type="button" onClick={() => setOpen(true)}>
                  Browse Games
                </button>
              </div>
            </div>
            <div className="game-hub__hero-feature">
              <div className="game-hub__featured">
                <div className="game-hub__featured-art" aria-hidden="true">
                  <img src={featured.previewImage} alt="" loading="lazy" />
                </div>
                <span className="game-hub__featured-label">Featured Today</span>
                <strong>{featured.title}</strong>
                <p>{featured.description}</p>
                <div className="game-hub__featured-meta">
                  <span>{featured.type}</span>
                  {featured.difficulty ? <span>{featured.difficulty}</span> : null}
                  <span>High score {meta.gameBest[featured.id] ?? 0}</span>
                </div>
                <button
                  className="button button--ghost"
                  onClick={() => {
                    setActiveGameId(featured.id);
                    setOpen(true);
                  }}
                  type="button"
                >
                  Play Now
                </button>
              </div>
              <div className={`game-hub__daily ${daily.completed ? "is-complete" : ""}`}>
                <span>Daily Challenge</span>
                <strong>{daily.challenge.title}</strong>
                <p>{daily.challenge.description}</p>
                <div className="game-hub__daily-meta">
                  <span>{daily.challenge.targetLabel}</span>
                  <span>{daily.completed ? "Complete" : "Active"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="game-hub__filters" data-reveal>
            <div className="game-hub__search">
              <label htmlFor="game-search">Search</label>
              <input
                id="game-search"
                type="search"
                placeholder="Search game, type, or keyword"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="game-hub__category-row">
              {categories.map((category) => (
                <button
                  className={`game-hub__pill ${activeCategory === category ? "is-active" : ""}`}
                  type="button"
                  key={category}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="game-hub__stats" data-reveal>
            <div>
              <span>Total plays</span>
              <strong>{meta.totalPlays}</strong>
            </div>
            <div>
              <span>Total score</span>
              <strong>{meta.totalScore}</strong>
            </div>
            <div>
              <span>Best score</span>
              <strong>{meta.bestScore}</strong>
            </div>
            <div>
              <span>Favorite game</span>
              <strong>
                {meta.favoriteGameId ? miniGames.find((game) => game.id === meta.favoriteGameId)?.title : "None"}
              </strong>
            </div>
          </div>

          <div className="game-hub__progress" data-reveal>
            <div>
              <span>Player Level</span>
              <strong>Level {progress.level}</strong>
            </div>
            <ProgressBar
              label={`XP to level ${progress.level + 1}`}
              value={`${progress.xpForNext} XP`}
              progress={progress.progress}
              accent="gold"
            />
          </div>

          <div className="game-hub__profile" data-reveal>
            <div className="game-hub__section-head">
              <h2>Player profile</h2>
              <span>Levels, achievements, and unlocks.</span>
            </div>
            <div className="game-hub__profile-grid">
              <div className="game-hub__profile-card">
                <span>Current Level</span>
                <strong>Level {progress.level}</strong>
                <p>{progress.xpForNext} XP to level {progress.level + 1}</p>
              </div>
              <div className="game-hub__profile-card">
                <span>Achievements</span>
                <div className="game-hub__profile-badges">
                  {topAchievements.length ? (
                    topAchievements.map((id) => (
                      <span className="game-hub__badge" key={id}>
                        {getAchievementLabel(id)}
                      </span>
                    ))
                  ) : (
                    <span className="game-hub__badge game-hub__badge--muted">No achievements yet</span>
                  )}
                </div>
              </div>
              <div className="game-hub__profile-card">
                <span>Rewards</span>
                <div className="game-hub__profile-badges">
                  {meta.rewardBadges.slice(0, 2).map((reward) => (
                    <span className="game-hub__badge" key={`badge-${reward}`}>
                      {reward}
                    </span>
                  ))}
                  {meta.rewardTitles.slice(0, 2).map((reward) => (
                    <span className="game-hub__badge game-hub__badge--title" key={`title-${reward}`}>
                      {reward}
                    </span>
                  ))}
                  {meta.rewardEffects.slice(0, 1).map((reward) => (
                    <span className="game-hub__badge game-hub__badge--effect" key={`effect-${reward}`}>
                      {reward}
                    </span>
                  ))}
                  {!meta.rewardBadges.length && !meta.rewardTitles.length && !meta.rewardEffects.length ? (
                    <span className="game-hub__badge game-hub__badge--muted">No rewards yet</span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="game-hub__profile-actions">
              <button className="button button--ghost" type="button" onClick={() => (window.location.href = "/games/achievements")}>
                View all achievements
              </button>
            </div>
          </div>

          <div className="game-hub__missions" data-reveal>
            <div className="game-hub__section-head">
              <h2>Daily Missions</h2>
              <span>
                {dailyCompleteCount}/{dailyTotal} completed
              </span>
            </div>
            <div className="game-hub__missions-grid">
              {dailyMissions.map((mission) => (
                <div className={`game-hub__mission ${mission.completed ? "is-complete" : ""}`} key={mission.id}>
                  <div>
                    <strong>{mission.label}</strong>
                    <span>
                      {mission.type === "score"
                        ? `${Math.min(mission.current, mission.target)} / ${mission.target}`
                        : `${mission.current} / ${mission.target}`}
                    </span>
                  </div>
                  <div className="game-hub__mission-meta">
                    <span>{mission.completed ? "Complete" : "In progress"}</span>
                    <span>+{mission.xpReward} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="game-hub__loot" data-reveal>
            <div className="game-hub__section-head">
              <h2>Reward boxes</h2>
              <span>Earn boxes from missions, level ups, and achievements.</span>
            </div>
            <div className="game-hub__loot-panel">
              <div className={`loot-box ${isOpeningLoot ? "is-opening" : ""}`}>
                <div className="loot-box__lid" />
                <div className="loot-box__body" />
                <div className="loot-box__shine" />
              </div>
              <div className="game-hub__loot-meta">
                <strong>{meta.lootBoxes} box{meta.lootBoxes === 1 ? "" : "es"} ready</strong>
                <p>Open a box to reveal coins or exclusive cosmetics.</p>
                <div className="game-hub__loot-actions">
                  <button className="button button--primary" disabled={meta.lootBoxes <= 0} onClick={openBox} type="button">
                    {meta.lootBoxes > 0 ? "Open box" : "No boxes yet"}
                  </button>
                  {rewardLabel ? <span className="game-hub__loot-reward">Reward: {rewardLabel}</span> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="game-hub__shop" data-reveal>
            <div className="game-hub__section-head">
              <h2>Arcade Shop</h2>
              <span>Spend coins on themes, effects, and premium looks.</span>
            </div>
            <div className="game-hub__shop-balance">
              <strong>{meta.coins} Coins</strong>
              <span>Balance</span>
              {shopMessage ? <em>{shopMessage}</em> : null}
            </div>
            <div className="game-hub__shop-grid">
              {shopItems.map((item) => {
                const owned = meta.ownedItems.includes(item.id);
                return (
                  <article className={`shop-card ${owned ? "is-owned" : ""}`} key={item.id}>
                    <div className="shop-card__top">
                      <span>{item.type}</span>
                      {owned ? <strong className="shop-card__owned">Owned</strong> : null}
                    </div>
                    <div className="shop-card__body">
                      <h3>{item.name}</h3>
                      <p>{item.preview}</p>
                    </div>
                    <div className="shop-card__footer">
                      <span className="shop-card__price">{item.price} coins</span>
                      <button
                        className="button button--ghost"
                        disabled={owned || meta.coins < item.price}
                        onClick={() => handlePurchase(item.id, item.price)}
                        type="button"
                      >
                        {owned ? "Owned" : meta.coins < item.price ? "Need coins" : "Buy"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {favoriteGames.length ? (
            <div className="game-hub__section" data-reveal>
              <div className="game-hub__section-head">
                <h2>Favorites</h2>
                <span>Quick access to your saved games.</span>
              </div>
              <div className="game-hub__grid">
                {favoriteGames.map((game) => (
                  <GameHubCard
                    game={game}
                    highScore={meta.gameBest[game.id] ?? 0}
                    isFavorite
                    onPlay={() => {
                      setActiveGameId(game.id);
                      setOpen(true);
                    }}
                    onToggleFavorite={() => toggle(game.id)}
                    key={game.id}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {mostPlayed.length ? (
            <div className="game-hub__section" data-reveal>
              <div className="game-hub__section-head">
                <h2>Most played</h2>
                <span>Your personal hits and high traffic picks.</span>
              </div>
              <div className="game-hub__grid">
                {mostPlayed.map((game) => (
                  <GameHubCard
                    game={game}
                    highScore={meta.gameBest[game.id] ?? 0}
                    isFavorite={favorites.includes(game.id)}
                    onPlay={() => {
                      setActiveGameId(game.id);
                      setOpen(true);
                    }}
                    onToggleFavorite={() => toggle(game.id)}
                    key={game.id}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {activeCategory === "All" ? (
            Object.entries(gamesByCategory).map(([category, games]) =>
              games.length ? (
                <div className="game-hub__section" data-reveal key={category}>
                  <div className="game-hub__section-head">
                    <h2>{category}</h2>
                    <span>Curated {category.toLowerCase()} experiences.</span>
                  </div>
                  <div className="game-hub__grid">
                    {games.map((game) => (
                      <GameHubCard
                        game={game}
                        highScore={meta.gameBest[game.id] ?? 0}
                        isFavorite={favorites.includes(game.id)}
                        onPlay={() => {
                          setActiveGameId(game.id);
                          setOpen(true);
                        }}
                        onToggleFavorite={() => toggle(game.id)}
                        key={game.id}
                      />
                    ))}
                  </div>
                </div>
              ) : null
            )
          ) : (
            <div className="game-hub__section" data-reveal>
              <div className="game-hub__section-head">
                <h2>{activeCategory}</h2>
                <span>Focused picks for {activeCategory.toLowerCase()} fans.</span>
              </div>
              <div className="game-hub__grid">
                {filteredGames.map((game) => (
                  <GameHubCard
                    game={game}
                    highScore={meta.gameBest[game.id] ?? 0}
                    isFavorite={favorites.includes(game.id)}
                    onPlay={() => {
                      setActiveGameId(game.id);
                      setOpen(true);
                    }}
                    onToggleFavorite={() => toggle(game.id)}
                    key={game.id}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="game-hub__section" data-reveal>
            <div className="game-hub__section-head">
              <h2>Recently played</h2>
              <span>Jump back into your latest runs.</span>
            </div>
            <div className="game-hub__recent">
              {meta.recent.length ? (
                meta.recent.map((run, index) => (
                  <button
                    className="game-hub__recent-card"
                    key={`${run.gameId}-${run.at}-${index}`}
                    onClick={() => {
                      setActiveGameId(run.gameId);
                      setOpen(true);
                    }}
                    type="button"
                  >
                    <strong>{miniGames.find((game) => game.id === run.gameId)?.title}</strong>
                    <span>Score {run.score}</span>
                  </button>
                ))
              ) : (
                <div className="game-hub__empty">Play a round to build your history.</div>
              )}
            </div>
          </div>
        </div>
      </section>
      <MiniGamesModal
        activeGameId={activeGameId}
        onClose={() => setOpen(false)}
        onSelectGame={setActiveGameId}
        open={open}
      />
    </>
  );
}

function GameHubCard({
  game,
  highScore,
  isFavorite,
  onPlay,
  onToggleFavorite
}: {
  game: { id: MiniGameId; title: string; description: string; type: string; difficulty?: string; previewImage: string };
  highScore: number;
  isFavorite: boolean;
  onPlay: () => void;
  onToggleFavorite: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handlePreviewStart = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    video.play().catch(() => undefined);
  };

  const handlePreviewStop = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <article
      className="game-hub__card"
      onMouseEnter={handlePreviewStart}
      onMouseLeave={handlePreviewStop}
      onFocus={handlePreviewStart}
      onBlur={handlePreviewStop}
    >
      <div className="game-hub__card-visual">
        <img src={game.previewImage} alt={`${game.title} preview`} loading="lazy" />
        <video
          ref={videoRef}
          src="/classic-maple-nostalgia.mp4"
          muted
          playsInline
          loop
          preload="metadata"
          aria-hidden="true"
        />
      </div>
      <div className="game-hub__card-body">
        <div>
          <strong>{game.title}</strong>
          <p>{game.description}</p>
        </div>
        <div className="game-hub__card-meta">
          <span>{game.type}</span>
          {game.difficulty ? <span>{game.difficulty}</span> : null}
          <span>High {highScore}</span>
        </div>
        <div className="game-hub__card-actions">
          <button className="button button--ghost" onClick={onPlay} type="button">
            Play
          </button>
          <button className={`game-hub__favorite ${isFavorite ? "is-active" : ""}`} onClick={onToggleFavorite} type="button">
            {isFavorite ? "Favorited" : "Favorite"}
          </button>
        </div>
      </div>
    </article>
  );
}
