import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { inAppNotifications } from "../../data/inAppNotifications";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(
    () =>
      inAppNotifications.map((item) => ({
        ...item,
        unread: item.unread && !readIds.includes(item.id)
      })),
    [readIds]
  );
  const unreadCount = items.filter((item) => item.unread).length;

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
