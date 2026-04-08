import { useEffect, useState } from "react";
import { Button } from "../ui/Button";

type ClipMoment = {
  id: string;
  label: string;
  note: string;
  start: number;
  end: number;
};

type ClipEditorStudioProps = {
  durationSeconds: number;
  moments: ClipMoment[];
  sourceTitle: string;
  thumbnail?: string;
};

export function ClipEditorStudio({
  durationSeconds,
  moments,
  sourceTitle,
  thumbnail
}: ClipEditorStudioProps) {
  const [activeMomentId, setActiveMomentId] = useState(moments[0]?.id ?? "");
  const activeMoment = moments.find((moment) => moment.id === activeMomentId) ?? moments[0];
  const [start, setStart] = useState(activeMoment?.start ?? 18);
  const [end, setEnd] = useState(activeMoment?.end ?? 42);

  useEffect(() => {
    if (!activeMoment) {
      return;
    }

    setStart(activeMoment.start);
    setEnd(activeMoment.end);
  }, [activeMoment]);

  const clipLength = Math.max(end - start, 1);
  const startPercent = (start / durationSeconds) * 100;
  const endPercent = (end / durationSeconds) * 100;

  function selectMoment(moment: ClipMoment) {
    setActiveMomentId(moment.id);
    setStart(moment.start);
    setEnd(moment.end);
  }

  function handleStartChange(value: number) {
    setStart(Math.min(value, end - 1));
  }

  function handleEndChange(value: number) {
    setEnd(Math.max(value, start + 1));
  }

  return (
    <section className="clip-editor card" data-reveal>
      <div className="clip-editor__head">
        <div>
          <span className="section-header__eyebrow">Clip Lab</span>
          <h3>Pick the moment. Cut it clean.</h3>
          <p>Preview the hit, trim the timeline, and lock the best part fast.</p>
        </div>
        <div className="clip-editor__meta">
          <span>Source</span>
          <strong>{sourceTitle}</strong>
        </div>
      </div>

      <div className="clip-editor__grid">
        <div className="clip-editor__preview">
          <div className="clip-editor__media">
            {thumbnail ? <img alt={sourceTitle} decoding="async" loading="lazy" src={thumbnail} /> : null}
            <div className="clip-editor__overlay">
              <span className="clip-editor__pill">Preview</span>
              <strong>{activeMoment?.label ?? "Featured moment"}</strong>
              <small>{formatTime(start)} - {formatTime(end)} • {clipLength}s clip</small>
            </div>
          </div>
          <div className="clip-editor__actions">
            <Button variant="primary">Preview Clip</Button>
            <Button variant="secondary">Save to Queue</Button>
          </div>
        </div>

        <div className="clip-editor__controls">
          <div className="clip-editor__moments">
            {moments.map((moment) => (
              <button
                className={`clip-editor__moment ${moment.id === activeMoment?.id ? "is-active" : ""}`}
                key={moment.id}
                onClick={() => selectMoment(moment)}
                type="button"
              >
                <strong>{moment.label}</strong>
                <span>{moment.note}</span>
              </button>
            ))}
          </div>

          <div className="clip-editor__timeline">
            <div className="clip-editor__timeline-top">
              <strong>Trim timeline</strong>
              <span>{formatTime(start)} - {formatTime(end)}</span>
            </div>
            <div className="clip-editor__track">
              <span
                className="clip-editor__selection"
                style={{ left: `${startPercent}%`, width: `${Math.max(endPercent - startPercent, 2)}%` }}
              />
            </div>
            <div className="clip-editor__sliders">
              <label>
                <span>Start</span>
                <input
                  max={Math.max(durationSeconds - 1, 1)}
                  min={0}
                  onChange={(event) => handleStartChange(Number(event.target.value))}
                  type="range"
                  value={start}
                />
              </label>
              <label>
                <span>End</span>
                <input
                  max={durationSeconds}
                  min={1}
                  onChange={(event) => handleEndChange(Number(event.target.value))}
                  type="range"
                  value={end}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
