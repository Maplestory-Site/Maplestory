import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

type NextStreamCountdownProps = {
  targetDate: Date;
  title?: string;
  description?: string;
  compact?: boolean;
};

const REMINDER_STORAGE_KEY = "snailslayer-next-stream-reminder";

export function NextStreamCountdown({
  targetDate,
  title = "Next stream starts soon",
  description = "Boss attempts, progression calls, and live MapleStory breakdowns.",
  compact = false
}: NextStreamCountdownProps) {
  const [countdown, setCountdown] = useState(() => getCountdownParts(targetDate));
  const [reminderSet, setReminderSet] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(REMINDER_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdownParts(targetDate));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [targetDate]);

  const nextStreamLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: compact ? undefined : "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(targetDate);
  }, [compact, targetDate]);

  function toggleReminder() {
    const next = !reminderSet;
    setReminderSet(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REMINDER_STORAGE_KEY, String(next));
    }
  }

  return (
    <article className={`next-stream-card ${compact ? "next-stream-card--compact" : ""}`}>
      <div className="next-stream-card__top">
        <Badge label="Next Stream" tone="info" />
        {reminderSet ? <span className="next-stream-card__status">Reminder on</span> : null}
      </div>
      <div className="next-stream-card__copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="countdown-row next-stream-card__countdown" aria-label="Next stream countdown">
        <div className="countdown-pill">
          <span>{countdown.days}</span>
          <small>Days</small>
        </div>
        <div className="countdown-pill">
          <span>{countdown.hours}</span>
          <small>Hours</small>
        </div>
        <div className="countdown-pill">
          <span>{countdown.minutes}</span>
          <small>Min</small>
        </div>
        <div className="countdown-pill">
          <span>{countdown.seconds}</span>
          <small>Sec</small>
        </div>
      </div>
      <div className="next-stream-card__footer">
        <div className="next-stream-card__datetime">
          <span>Scheduled for</span>
          <strong>{nextStreamLabel}</strong>
        </div>
        <Button onClick={toggleReminder} variant={reminderSet ? "secondary" : "primary"}>
          {reminderSet ? "Reminder Set" : "Remind Me"}
        </Button>
      </div>
    </article>
  );
}

function getCountdownParts(target: Date) {
  const remaining = Math.max(target.getTime() - Date.now(), 0);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0")
  };
}
