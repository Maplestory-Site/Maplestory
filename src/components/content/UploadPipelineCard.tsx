import type { PipelineStep, UploadAssetType } from "../../data/contentAutomation";
import { formatSupportedTypes } from "../../lib/contentPipeline";

type UploadPipelineCardProps = {
  steps: PipelineStep[];
  supportedTypes: UploadAssetType[];
};

export function UploadPipelineCard({ steps, supportedTypes }: UploadPipelineCardProps) {
  return (
    <article className="card upload-pipeline-card">
      <span className="section-header__eyebrow">Pipeline ready</span>
      <h3>Auto upload flow</h3>
      <p>Prepared for files, clips, and Telegram drops without manual repeat work.</p>
      <strong className="upload-pipeline-card__summary">{formatSupportedTypes(supportedTypes)}</strong>

      <div className="upload-pipeline-card__types">
        {supportedTypes.map((type) => (
          <span key={type}>{type.toUpperCase()}</span>
        ))}
      </div>

      <div className="upload-pipeline-card__steps">
        {steps.map((step, index) => (
          <div className="upload-pipeline-card__step" key={step.id}>
            <span className="upload-pipeline-card__step-number">0{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
