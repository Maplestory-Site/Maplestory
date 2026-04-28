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
      <div className="isw-start__chrome">
        <span>English</span>
      </div>

      <motion.header
        className="isw-start__hero"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
      >
        <p className="isw-start__eyebrow">Maple idle adventure</p>
        <h1>IdleStory World</h1>
        <p>Build. Fight. Become Legend.</p>
      </motion.header>

      <main className="isw-start__options" aria-label="IdleStory start options">
        <motion.section
          className={`isw-start-card isw-start-card--continue ${config.primaryAction === "continue" ? "is-primary" : ""} ${!config.continueEnabled ? "is-disabled" : ""}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.04 }}
        >
          <div className="isw-start-card__icon">SAVE</div>
          <h2>Continue Game</h2>
          <p>Continue your adventure from where you left off.</p>
          <div className={`isw-save-badge ${config.hasValidLocalSave ? "is-found" : "is-empty"}`}>
            <strong>{config.hasValidLocalSave ? "Local Save Found" : "No Save Yet"}</strong>
            <span>{saveDetails}</span>
            <small>{formatSaveDate(saveStatus.lastSavedAt)}</small>
          </div>
          <motion.button
            type="button"
            className="isw-start-btn isw-start-btn--continue"
            disabled={!config.continueEnabled}
            whileHover={config.continueEnabled ? { y: -2 } : undefined}
            whileTap={config.continueEnabled ? { scale: 0.97 } : undefined}
            onClick={onContinue}
          >
            Continue
          </motion.button>
        </motion.section>

        <motion.section
          className={`isw-start-card isw-start-card--new ${config.primaryAction === "new" ? "is-primary" : ""}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1 }}
        >
          <div className="isw-start-card__icon">NEW</div>
          <h2>Start New Game</h2>
          <p>Begin a fresh IdleStory World adventure.</p>
          <div className="isw-start-card__note">
            Starting a new game asks first when an existing save is found.
          </div>
          <motion.button
            type="button"
            className="isw-start-btn isw-start-btn--new"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStartNew}
          >
            New Game
          </motion.button>
        </motion.section>

        <motion.section
          className="isw-start-card isw-start-card--auth"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.16 }}
        >
          <div className="isw-start-card__icon">ID</div>
          <h2>Register / Sign In</h2>
          <p>Protect your progress with cloud save support.</p>
          <ul className="isw-start-list">
            <li>Cloud save protection</li>
            <li>Cross-device progress</li>
            <li>Future leaderboards and social</li>
          </ul>
          <motion.button
            type="button"
            className="isw-start-btn isw-start-btn--auth"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onRegister}
          >
            Sign In
          </motion.button>
        </motion.section>
      </main>

      <footer className="isw-start__save-note">
        <strong>{isSignedIn ? "Signed in save protection is active." : "Local saves work on this device."}</strong>
        <span>Sign in to protect your progress and never lose your adventure.</span>
      </footer>

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
