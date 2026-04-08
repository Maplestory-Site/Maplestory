import { Button } from "../ui/Button";
import type { NotificationPreference } from "../../data/aiExperience";

type NotificationPreferencesPanelProps = {
  options: NotificationPreference[];
  preferences: Record<NotificationPreference["id"], boolean>;
  subscribedCount: number;
  onToggle: (id: NotificationPreference["id"]) => void;
  onSimulateLive: () => void;
};

export function NotificationPreferencesPanel({
  options,
  preferences,
  subscribedCount,
  onToggle,
  onSimulateLive
}: NotificationPreferencesPanelProps) {
  return (
    <article className="card notification-panel" data-reveal>
      <div className="notification-panel__top">
        <div>
          <span className="section-header__eyebrow">Notifications</span>
          <h3>Stay one step ahead</h3>
          <p>Pick the alerts worth your attention.</p>
        </div>
        <span className="notification-panel__count">{subscribedCount} active</span>
      </div>
      <div className="notification-panel__list">
        {options.map((option) => {
          const enabled = preferences[option.id];

          return (
            <button
              className={`notification-toggle ${enabled ? "is-active" : ""}`}
              key={option.id}
              onClick={() => onToggle(option.id)}
              type="button"
            >
              <div>
                <strong>{option.label}</strong>
                <p>{option.description}</p>
              </div>
              <span className="notification-toggle__switch" aria-hidden="true">
                <span />
              </span>
            </button>
          );
        })}
      </div>
      <div className="notification-panel__actions">
        <Button href="/community">Join Discord</Button>
        <Button onClick={onSimulateLive} variant="secondary">Test live alert</Button>
      </div>
    </article>
  );
}
