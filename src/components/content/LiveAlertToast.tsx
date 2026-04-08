import { Button } from "../ui/Button";

type LiveAlertToastProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function LiveAlertToast({ visible, onDismiss }: LiveAlertToastProps) {
  if (!visible) {
    return null;
  }

  return (
    <aside aria-live="polite" className="live-alert-toast">
      <div>
        <span className="section-header__eyebrow">Live alert</span>
        <strong>SNAILSLAYER just went live</strong>
        <p>Bossing, progression, and live MapleStory calls are on now.</p>
      </div>
      <div className="live-alert-toast__actions">
        <Button href="/live" size="sm">Watch now</Button>
        <Button onClick={onDismiss} size="sm" variant="secondary">Dismiss</Button>
      </div>
    </aside>
  );
}
