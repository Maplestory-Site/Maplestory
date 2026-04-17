import { useEffect, useMemo, useRef, useState } from "react";

type PreferenceState = {
  live: boolean;
  videos: boolean;
  clips: boolean;
};

const STORAGE_KEY = "snailslayer-engagement-prefs";

const defaultPreferences: PreferenceState = {
  live: true,
  videos: false,
  clips: true
};

function readStoredPreferences(): PreferenceState {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultPreferences;
    }

    return { ...defaultPreferences, ...JSON.parse(raw) } as PreferenceState;
  } catch {
    return defaultPreferences;
  }
}

export function useEngagementSystem(isLive: boolean) {
  const [preferences, setPreferences] = useState<PreferenceState>(readStoredPreferences);
  const [livePromptVisible, setLivePromptVisible] = useState(false);
  const [mockLiveStarted, setMockLiveStarted] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (!isLive && !mockLiveStarted) {
      return;
    }

    if (!preferences.live) {
      return;
    }

    const showTimer = window.setTimeout(() => setLivePromptVisible(true), 0);
    const hideTimer = window.setTimeout(() => {
      setLivePromptVisible(false);
      setMockLiveStarted(false);
    }, 7000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isLive, mockLiveStarted, preferences.live]);

  const subscribedCount = useMemo(
    () => Object.values(preferences).filter(Boolean).length,
    [preferences]
  );

  function togglePreference(id: keyof PreferenceState) {
    setPreferences((current) => ({
      ...current,
      [id]: !current[id]
    }));
  }

  function simulateLiveStart() {
    setMockLiveStarted(true);
  }

  function dismissPrompt() {
    setLivePromptVisible(false);
    setMockLiveStarted(false);
  }

  return {
    preferences,
    subscribedCount,
    livePromptVisible,
    mockLiveStarted,
    togglePreference,
    simulateLiveStart,
    dismissPrompt
  };
}
