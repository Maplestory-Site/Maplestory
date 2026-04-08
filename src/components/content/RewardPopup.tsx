type RewardPopupProps = {
  title: string;
  note: string;
  visible: boolean;
  onClose: () => void;
};

export function RewardPopup({ title, note, visible, onClose }: RewardPopupProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="reward-popup" role="status" aria-live="polite">
      <span className="reward-popup__icon" aria-hidden="true">
        +
      </span>
      <div className="reward-popup__copy">
        <strong>{title}</strong>
        <p>{note}</p>
      </div>
      <button className="reward-popup__close" onClick={onClose} type="button">
        Close
      </button>
    </div>
  );
}
