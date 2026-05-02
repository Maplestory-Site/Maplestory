import { AnimatePresence, motion } from "framer-motion";
import "./IdleStoryStartScreen.css";
import type { LocalSaveStatus } from "../gameEngine";
import {
  getStartScreenConfig,
  type StartAction,
  type StartScreenMode
} from "../startScreenFlow";

type IdleStoryStartScreenProps = {
  saveStatus: LocalSaveStatus;
  startScreenMode: StartScreenMode;
  selectedStartAction: StartAction | null;
  isSignedIn: boolean;
  onContinue: () => void;
  onStartNew: () => void;
  onConfirmNewGame: () => void;
  onCancelModal: () => void;
  onRegister: () => void;
};

const START_SCREEN_IMAGE = "/idlestory/start-screen-maple-idle-adventure.png";

function formatSaveDate(timestamp: number | null) {
  if (!timestamp) return "Unknown save time";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function getSelectedActionLabel(action: StartAction | null) {
  if (action === "continue") return "Continue Game";
  if (action === "new") return "Start New Game";
  if (action === "register") return "Register / Sign In";
  return "IdleStory World";
}

export function IdleStoryStartScreen({
  saveStatus,
  startScreenMode,
  selectedStartAction,
  isSignedIn,
  onContinue,
  onStartNew,
  onConfirmNewGame,
  onCancelModal,
  onRegister
}: IdleStoryStartScreenProps) {
  const config = getStartScreenConfig(saveStatus);
  const saveDetails = config.hasValidLocalSave
    ? `Lv.${saveStatus.level ?? 1} - Stage ${saveStatus.stage ?? 1}`
    : "No local save found";

  return (
    <div className="isw-start">
      <motion.div
        className="isw-start__showcase"
        initial={{ opacity: 0, scale: 1.015 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
      >
        <img
          className="isw-start__showcase-image"
          src={START_SCREEN_IMAGE}
          alt="Maple Idle Adventure welcome screen"
          draggable={false}
        />

        <button
          type="button"
          className="isw-start-hotspot isw-start-hotspot--continue"
          disabled={!config.continueEnabled}
          aria-label={config.continueEnabled ? "Continue Game" : "Continue Game unavailable, no local save found"}
          onClick={onContinue}
        >
          <span>Continue Game</span>
        </button>

        <button
          type="button"
          className="isw-start-hotspot isw-start-hotspot--new"
          aria-label="Start New Game"
          onClick={onStartNew}
        >
          <span>Start New Game</span>
        </button>

        <button
          type="button"
          className="isw-start-hotspot isw-start-hotspot--auth"
          aria-label="Register or Sign In"
          onClick={onRegister}
        >
          <span>Register / Sign In</span>
        </button>

        <div className={`isw-start__save-overlay ${config.hasValidLocalSave ? "is-found" : "is-empty"}`}>
          <strong>{config.hasValidLocalSave ? "Local Save Found" : "No Save Yet"}</strong>
          <span>{saveDetails}</span>
          <small>
            {config.hasValidLocalSave
              ? formatSaveDate(saveStatus.lastSavedAt)
              : "Start a new adventure."}
          </small>
        </div>

        <p className="isw-start__device-note">
          <strong>{isSignedIn ? "Cloud save protection is active." : "Local saves work on this device."}</strong>
          <span>Sign in to protect your progress and never lose your adventure.</span>
        </p>
      </motion.div>

      <AnimatePresence>
        {startScreenMode !== "menu" ? (
          <motion.div
            className="isw-start-modal"
            role="dialog"
            aria-modal="true"
            aria-label={getSelectedActionLabel(selectedStartAction)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="isw-start-modal__panel"
              initial={{ scale: 0.94, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
            >
              {startScreenMode === "confirm-new-game" ? (
                <>
                  <p className="isw-start__eyebrow">Confirm new adventure</p>
                  <h2>Start a new game?</h2>
                  <p>
                    A local save already exists. Your old save will only be replaced after you confirm.
                  </p>
                  <div className="isw-start-modal__actions">
                    <button type="button" className="isw-start-btn isw-start-btn--quiet" onClick={onCancelModal}>
                      Cancel
                    </button>
                    <button type="button" className="isw-start-btn isw-start-btn--new" onClick={onConfirmNewGame}>
                      Start New
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="isw-start__eyebrow">Save protection</p>
                  <h2>{isSignedIn ? "Account connected" : "Register / Sign In"}</h2>
                  <p>
                    Signing in enables cloud save and protects your progress if this device is reset.
                  </p>
                  <div className="isw-start-modal__actions">
                    <button type="button" className="isw-start-btn isw-start-btn--quiet" onClick={onCancelModal}>
                      Close
                    </button>
                    {!isSignedIn ? (
                      <button type="button" className="isw-start-btn isw-start-btn--auth" onClick={onRegister}>
                        Open Sign In
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
