import { useEffect, useRef, useState } from "react";

export function BackgroundAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;

    const syncState = () => {
      if (!cancelled) {
        setIsPlaying(!audio.paused);
      }
    };

    const tryPlay = async () => {
      try {
        await audio.play();
        syncState();
      } catch {
        syncState();
      }
    };

    const startOnInteraction = () => {
      tryPlay();
      window.removeEventListener("pointerdown", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
      window.removeEventListener("touchstart", startOnInteraction);
    };

    tryPlay();

    window.addEventListener("pointerdown", startOnInteraction, { once: true });
    window.addEventListener("keydown", startOnInteraction, { once: true });
    window.addEventListener("touchstart", startOnInteraction, { once: true });
    audio.addEventListener("play", syncState);
    audio.addEventListener("pause", syncState);

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
      window.removeEventListener("touchstart", startOnInteraction);
      audio.removeEventListener("play", syncState);
      audio.removeEventListener("pause", syncState);
    };
  }, []);

  async function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
        return;
      }
      setIsPlaying(true);
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }

  return (
    <>
      <audio ref={audioRef} loop preload="auto" src="/sleepywood.mp3" />
      <button
        aria-label={isPlaying ? "Pause background music" : "Play background music"}
        className={`audio-toggle ${isPlaying ? "is-playing" : ""}`}
        onClick={toggleAudio}
        type="button"
      >
        <span className="audio-toggle__pulse" />
        <svg aria-hidden="true" className="audio-toggle__icon" viewBox="0 0 24 24">
          <path d="M12 3.75a.75.75 0 0 1 .75.75v9.69a3.251 3.251 0 1 1-1.5-2.75V4.5a.75.75 0 0 1 .75-.75Z" fill="currentColor" />
        </svg>
      </button>
    </>
  );
}
