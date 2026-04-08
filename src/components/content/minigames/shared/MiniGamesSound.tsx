import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type MiniGamesSoundContextValue = {
  muted: boolean;
  toggleMuted: () => void;
  playClick: () => void;
  playSuccess: () => void;
  playFailure: () => void;
};

const STORAGE_KEY = "snailslayer-mini-games-muted";

const MiniGamesSoundContext = createContext<MiniGamesSoundContextValue | null>(null);

export function MiniGamesSoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(muted));
  }, [muted]);

  function getAudioContext() {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  function playTone(frequency: number, duration: number, type: OscillatorType, gainValue: number, delay = 0) {
    if (muted) {
      return;
    }

    const audioContext = getAudioContext();
    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  const value = useMemo<MiniGamesSoundContextValue>(
    () => ({
      muted,
      toggleMuted: () => setMuted((current) => !current),
      playClick: () => {
        playTone(480, 0.08, "triangle", 0.018);
      },
      playSuccess: () => {
        playTone(660, 0.09, "sine", 0.02);
        playTone(920, 0.12, "triangle", 0.016, 0.055);
      },
      playFailure: () => {
        playTone(220, 0.12, "sawtooth", 0.012);
      }
    }),
    [muted]
  );

  return <MiniGamesSoundContext.Provider value={value}>{children}</MiniGamesSoundContext.Provider>;
}

export function useMiniGamesSound() {
  const context = useContext(MiniGamesSoundContext);

  if (!context) {
    throw new Error("useMiniGamesSound must be used within MiniGamesSoundProvider");
  }

  return context;
}
