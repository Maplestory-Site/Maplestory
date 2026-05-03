import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent } from "react";
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
const PARTICLE_COUNT = 30;
const SPARKLE_COUNT = 14;
const LEAF_COUNT = 10;

type StartParticle = {
  id: string;
  left: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
};

function createParticles(prefix: string, count: number, sizeBase: number, sizeVariance: number): StartParticle[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    left: (index * 37 + 11) % 100,
    top: (index * 53 + 17) % 100,
    delay: (index * 0.37) % 5,
    duration: 3.2 + ((index * 0.61) % 4.8),
    size: sizeBase + ((index * 7) % sizeVariance),
    drift: -18 + ((index * 19) % 37)
  }));
}

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
  const [isAnimationPaused, setIsAnimationPaused] = useState(false);
  const particles = useMemo(() => createParticles("glow", PARTICLE_COUNT, 4, 8), []);
  const sparkles = useMemo(() => createParticles("spark", SPARKLE_COUNT, 7, 10), []);
  const leaves = useMemo(() => createParticles("leaf", LEAF_COUNT, 10, 12), []);
  const config = getStartScreenConfig(saveStatus);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsAnimationPaused(document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--isw-parallax-x", `${(-x * 10).toFixed(2)}px`);
    event.currentTarget.style.setProperty("--isw-parallax-y", `${(-y * 8).toFixed(2)}px`);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--isw-parallax-x", "0px");
    event.currentTarget.style.setProperty("--isw-parallax-y", "0px");
  };

  return (
    <div className={`isw-start ${isAnimationPaused ? "is-animation-paused" : ""}`}>
      <motion.div
        className="isw-start__showcase"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        initial={{ opacity: 0, scale: 1.015 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
      >
        <div className="isw-start__parallax-layer">
          <img
            className="isw-start__showcase-image"
            src={START_SCREEN_IMAGE}
            alt="IdleStory World animated welcome screen"
            draggable={false}
          />
        </div>

        <div className="isw-start__vignette" aria-hidden="true" />

        <div className="isw-start__particles" aria-hidden="true">
          {particles.map((particle) => (
            <i
              key={particle.id}
              className="isw-start-particle isw-start-particle--dot"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                "--particle-drift": `${particle.drift}px`
              } as CSSProperties}
            />
          ))}
          {sparkles.map((particle) => (
            <i
              key={particle.id}
              className="isw-start-particle isw-start-particle--spark"
              style={{
                left: `${28 + (particle.left % 46)}%`,
                top: `${6 + (particle.top % 32)}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration * 0.72}s`
              }}
            />
          ))}
          {leaves.map((particle) => (
            <i
              key={particle.id}
              className="isw-start-particle isw-start-particle--leaf"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}px`,
                height: `${Math.max(8, particle.size - 4)}px`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration + 4}s`,
                "--particle-drift": `${particle.drift * 2}px`
              } as CSSProperties}
            />
          ))}
        </div>

        <div className="isw-start__title-aura" aria-hidden="true" />
        <div className="isw-start__creature-glow isw-start__creature-glow--slime" aria-hidden="true" />
        <div className="isw-start__creature-glow isw-start__creature-glow--hero" aria-hidden="true" />

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

        <span className="isw-start__sr-save-status">
          {config.hasValidLocalSave
            ? `Local save found. Level ${saveStatus.level ?? 1}, stage ${saveStatus.stage ?? 1}, saved ${formatSaveDate(saveStatus.lastSavedAt)}.`
            : "No local save found."}
        </span>

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
