import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  getLocalSaveStatus,
  loadGameState,
  saveGameState,
  type IdleGameState
} from "../gameEngine";
import { getStartScreenConfig, resolveStartAction } from "../startScreenFlow";

class MemoryStorage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function installStorage() {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { localStorage: new MemoryStorage() }
  });
}

function freshState(overrides: Partial<IdleGameState> = {}): IdleGameState {
  return { ...structuredClone(DEFAULT_STATE), ...overrides };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("IdleStory start screen flow", () => {
  it("shows Continue Game as the primary option when a valid save exists", () => {
    installStorage();
    saveGameState(freshState({ level: 18, stage: 42, lastSavedAt: 1_775_000_000_000 }));

    const status = getLocalSaveStatus();
    const config = getStartScreenConfig(status);

    expect(status.hasValidSave).toBe(true);
    expect(config.continueEnabled).toBe(true);
    expect(config.primaryAction).toBe("continue");
    expect(status.level).toBe(18);
    expect(status.stage).toBe(42);
  });

  it("disables Continue Game and highlights Start New Game when no save exists", () => {
    installStorage();

    const status = getLocalSaveStatus();
    const config = getStartScreenConfig(status);

    expect(status.hasValidSave).toBe(false);
    expect(config.continueEnabled).toBe(false);
    expect(config.primaryAction).toBe("new");
  });

  it("asks for confirmation before starting a new game when a save exists", () => {
    const resolution = resolveStartAction("new", true);

    expect(resolution.mode).toBe("confirm-new-game");
    expect(resolution.requiresConfirmation).toBe(true);
    expect(resolution.shouldCreateNewState).toBe(false);
    expect(resolution.shouldEnterGame).toBe(false);
  });

  it("loads the existing save when Continue Game is selected", () => {
    installStorage();
    saveGameState(freshState({ level: 27, stage: 90 }));

    const resolution = resolveStartAction("continue", getLocalSaveStatus().hasValidSave);
    const loaded = loadGameState();

    expect(resolution.shouldLoadSave).toBe(true);
    expect(resolution.shouldEnterGame).toBe(true);
    expect(loaded.level).toBe(27);
    expect(loaded.stage).toBe(90);
  });

  it("opens the auth info flow from Register / Sign In", () => {
    const resolution = resolveStartAction("register", false);

    expect(resolution.mode).toBe("auth-info");
    expect(resolution.shouldOpenAuth).toBe(true);
    expect(resolution.shouldEnterGame).toBe(false);
  });
});
