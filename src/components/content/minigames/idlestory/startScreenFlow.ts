import type { LocalSaveStatus } from "./gameEngine";

export type StartScreenMode = "menu" | "confirm-new-game" | "auth-info";
export type StartAction = "continue" | "new" | "register";

export type StartScreenConfig = {
  hasValidLocalSave: boolean;
  continueEnabled: boolean;
  primaryAction: StartAction;
};

export type StartActionResolution = {
  mode: StartScreenMode;
  shouldEnterGame: boolean;
  shouldLoadSave: boolean;
  shouldCreateNewState: boolean;
  shouldOpenAuth: boolean;
  requiresConfirmation: boolean;
};

export function getStartScreenConfig(saveStatus: LocalSaveStatus): StartScreenConfig {
  const hasValidLocalSave = saveStatus.hasValidSave;
  return {
    hasValidLocalSave,
    continueEnabled: hasValidLocalSave,
    primaryAction: hasValidLocalSave ? "continue" : "new"
  };
}

export function resolveStartAction(action: StartAction, hasValidLocalSave: boolean): StartActionResolution {
  if (action === "continue") {
    return {
      mode: "menu",
      shouldEnterGame: hasValidLocalSave,
      shouldLoadSave: hasValidLocalSave,
      shouldCreateNewState: false,
      shouldOpenAuth: false,
      requiresConfirmation: false
    };
  }

  if (action === "new") {
    return {
      mode: hasValidLocalSave ? "confirm-new-game" : "menu",
      shouldEnterGame: !hasValidLocalSave,
      shouldLoadSave: false,
      shouldCreateNewState: !hasValidLocalSave,
      shouldOpenAuth: false,
      requiresConfirmation: hasValidLocalSave
    };
  }

  return {
    mode: "auth-info",
    shouldEnterGame: false,
    shouldLoadSave: false,
    shouldCreateNewState: false,
    shouldOpenAuth: true,
    requiresConfirmation: false
  };
}
