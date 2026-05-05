import { DEFAULT_STATE } from "./src/components/content/minigames/idlestory/stateNormalization";
import { FALLBACK_ZONES, gameTick, type IdleGameState } from "./src/components/content/minigames/idlestory/gameEngine";
import { getHeroCost } from "./src/components/content/minigames/idlestory/heroSystem";

const context = { zone: FALLBACK_ZONES[0]!, monster: null, lootCount: 0 };

function fresh(): IdleGameState {
  return structuredClone(DEFAULT_STATE);
}

function tick(state: IdleGameState): IdleGameState {
  return gameTick(state, 1, context, () => 0.99);
}

function firstUpgradeSecond(): number | null {
  let state = fresh();
  for (let second = 0; second <= 900; second += 1) {
    const cost = getHeroCost("snailguard", state.heroLevels.snailguard);
    if (state.mesos >= cost) return second;
    state = tick(state);
  }
  return null;
}

function firstKillSecond(): number | null {
  let state = fresh();
  const startStage = state.stage;
  for (let second = 1; second <= 900; second += 1) {
    state = tick(state);
    if (state.stage > startStage) return second;
  }
  return null;
}

function simulate(seconds: number): IdleGameState {
  let state = fresh();
  for (let second = 0; second < seconds; second += 1) {
    state = tick(state);
  }
  return state;
}

const s60 = simulate(60);
const s300 = simulate(300);
const s900 = simulate(900);

console.log(JSON.stringify({
  firstUpgradeSecond: firstUpgradeSecond(),
  firstKillSecond: firstKillSecond(),
  after60: { level: s60.level, stage: s60.stage, mesos: Math.round(s60.mesos), xp: Math.round(s60.xp) },
  after300: { level: s300.level, stage: s300.stage, mesos: Math.round(s300.mesos), xp: Math.round(s300.xp) },
  after900: { level: s900.level, stage: s900.stage, mesos: Math.round(s900.mesos), xp: Math.round(s900.xp) }
}, null, 2));
