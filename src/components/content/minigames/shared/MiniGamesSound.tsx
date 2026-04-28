import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useGameSettings } from "./gameSettings";

type MiniGamesSoundContextValue = {
  muted: boolean;
  toggleMuted: () => void;
  playClick: () => void;
  playSuccess: () => void;
  playFailure: () => void;
  playHit: () => void;
  playCrit: () => void;
  playLevelUp: () => void;
  playReward: () => void;
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
  const musicRef = useRef<{ osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null>(null);
  const { settings } = useGameSettings();

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

  useEffect(() => {
    if (muted || !settings.music) {
      if (musicRef.current) {
        musicRef.current.osc.stop();
        musicRef.current.lfo.stop();
        musicRef.current.osc.disconnect();
        musicRef.current.lfo.disconnect();
        musicRef.current.gain.disconnect();
        musicRef.current = null;
      }
      return;
    }

    const audioContext = getAudioContext();
    if (!audioContext) {
      return;
    }

    if (musicRef.current) {
      return;
    }

    const osc = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    const gain = audioContext.createGain();

    osc.type = "sine";
    osc.frequency.value = 120;
    lfo.type = "sine";
    lfo.frequency.value = 0.25;
    lfoGain.gain.value = 18;
    gain.gain.value = 0.02;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    lfo.start();

    musicRef.current = { osc, lfo, gain };
  }, [muted, settings.music]);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType, gainValue: number, delay = 0) => {
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
  }, [muted]);

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
      },
      playHit: () => {
        playTone(180, 0.045, "square", 0.01);
      },
      playCrit: () => {
        playTone(520, 0.045, "triangle", 0.018);
        playTone(1040, 0.09, "sine", 0.015, 0.035);
      },
      playLevelUp: () => {
        playTone(520, 0.08, "triangle", 0.018);
        playTone(760, 0.1, "triangle", 0.017, 0.055);
        playTone(1120, 0.13, "sine", 0.014, 0.12);
      },
      playReward: () => {
        playTone(740, 0.06, "triangle", 0.014);
        playTone(980, 0.08, "sine", 0.012, 0.045);
      }
    }),
    [muted, playTone]
  );

  return <MiniGamesSoundContext.Provider value={value}>{children}</MiniGamesSoundContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMiniGamesSound() {
  const context = useContext(MiniGamesSoundContext);

  if (!context) {
    throw new Error("useMiniGamesSound must be used within MiniGamesSoundProvider");
  }

  return context;
}
