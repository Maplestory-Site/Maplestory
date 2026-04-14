import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { inAppNotifications } from "../../data/inAppNotifications";
import { useGameMeta } from "../content/minigames/shared/useGameMeta";

const READ_KEY = "snailslayer-notifications-read";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const meta = useGameMeta();

  const items = useMemo(
    () =>
      [
        ...inAppNotifications,
        ...(meta.lootBoxes > 0
          ? [
              {
                id: "reward-boxes",
                title: "Rewards waiting",
                detail: `Open ${meta.lootBoxes} reward box${meta.lootBoxes === 1 ? "" : "es"} and claim coins or cosmetics.`,
                href: "/games",
                timestamp: "Today",
                kind: "reward" as const
              }
            ]
          : []),
        ...(meta.dailyMissions.missions.some((mission) => mission.completed)
          ? [
              {
                id: "mission-complete",
                title: "Mission complete",
                detail: "Daily missions are ready to claim rewards.",
                href: "/games",
                timestamp: "Today",
                kind: "mission" as const
              }
            ]
          : [])
      ].map((item) => ({
        ...item,
        unread: (item.unread ?? true) && !readIds.includes(item.id)
      })),
    [meta.dailyMissions.missions, meta.lootBoxes, readIds]
  );
  const unreadCount = items.filter((item) => item.unread).length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(READ_KEY, JSON.stringify(readIds));
  }, [readIds]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function markAllRead() {
    setReadIds(items.map((item) => item.id));
  }

  function markRead(id: string) {
    setReadIds((current) => (current.includes(id) ? current : [...current, id]));
    setOpen(false);
  }

  return (
    <div className="notification-dropdown" ref={wrapperRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        className={`notification-bell ${unreadCount ? "has-unread" : ""} ${open ? "is-open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M12 3.5a4 4 0 0 0-4 4v1.2c0 1.1-.3 2.2-.8 3.1l-1 1.7a1.5 1.5 0 0 0 1.3 2.3h9a1.5 1.5 0 0 0 1.3-2.3l-1-1.7a6.2 6.2 0 0 1-.8-3.1V7.5a4 4 0 0 0-4-4Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M9.5 18a2.5 2.5 0 0 0 5 0"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
        {unreadCount ? <span className="notification-bell__count">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notification-dropdown__panel card" role="dialog" aria-label="Recent updates">
          <div className="notification-dropdown__top">
            <div>
              <strong>Recent updates</strong>
              <p>Live, clips, and fresh drops.</p>
            </div>
            <button className="notification-dropdown__mark" onClick={markAllRead} type="button">
              Mark all read
            </button>
          </div>

          <div className="notification-dropdown__list">
            {items.map((item) => (
              <Link
                className={`notification-dropdown__item ${item.unread ? "is-unread" : ""}`}
                key={item.id}
                onClick={() => markRead(item.id)}
                to={item.href}
              >
                <span className={`notification-dropdown__pill notification-dropdown__pill--${item.kind}`}>{item.kind}</span>
                <div className="notification-dropdown__content">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <small>{item.timestamp}</small>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
