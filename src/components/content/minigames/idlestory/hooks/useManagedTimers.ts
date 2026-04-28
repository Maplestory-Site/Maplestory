import { useCallback, useEffect, useRef, type MutableRefObject } from "react";

export type ManagedTimeoutHandle = number;
export type ManagedIntervalHandle = number;

export function useManagedTimers() {
  const isMountedRef = useRef(true);
  const timeoutHandlesRef = useRef<Set<ManagedTimeoutHandle>>(new Set());
  const intervalHandlesRef = useRef<Set<ManagedIntervalHandle>>(new Set());

  const clearManagedTimeout = useCallback((timer: ManagedTimeoutHandle | null | undefined) => {
    if (timer == null) return;
    window.clearTimeout(timer);
    timeoutHandlesRef.current.delete(timer);
  }, []);

  const clearManagedInterval = useCallback((timer: ManagedIntervalHandle | null | undefined) => {
    if (timer == null) return;
    window.clearInterval(timer);
    intervalHandlesRef.current.delete(timer);
  }, []);

  const setManagedTimeout = useCallback((callback: () => void, delayMs: number): ManagedTimeoutHandle => {
    const timer = window.setTimeout(() => {
      timeoutHandlesRef.current.delete(timer);
      if (!isMountedRef.current) return;
      callback();
    }, delayMs);
    timeoutHandlesRef.current.add(timer);
    return timer;
  }, []);

  const setManagedInterval = useCallback((callback: () => void, delayMs: number): ManagedIntervalHandle => {
    const timer = window.setInterval(() => {
      if (!isMountedRef.current) return;
      callback();
    }, delayMs);
    intervalHandlesRef.current.add(timer);
    return timer;
  }, []);

  const resetManagedTimeoutRef = useCallback((
    timerRef: MutableRefObject<ManagedTimeoutHandle | null>,
    callback: () => void,
    delayMs: number
  ) => {
    clearManagedTimeout(timerRef.current);
    timerRef.current = setManagedTimeout(() => {
      timerRef.current = null;
      callback();
    }, delayMs);
  }, [clearManagedTimeout, setManagedTimeout]);

  const clearAllManagedTimers = useCallback(() => {
    for (const timer of timeoutHandlesRef.current) {
      window.clearTimeout(timer);
    }
    timeoutHandlesRef.current.clear();
    for (const timer of intervalHandlesRef.current) {
      window.clearInterval(timer);
    }
    intervalHandlesRef.current.clear();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAllManagedTimers();
    };
  }, [clearAllManagedTimers]);

  return {
    isMountedRef,
    setManagedTimeout,
    clearManagedTimeout,
    setManagedInterval,
    clearManagedInterval,
    resetManagedTimeoutRef
  };
}
