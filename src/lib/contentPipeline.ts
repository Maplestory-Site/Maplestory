import type { PipelineStep, UploadAssetType } from "../data/contentAutomation";

export type UploadJobStatus = "detected" | "prepared" | "sent" | "cleaned";

export type UploadJob = {
  id: string;
  fileName: string;
  fileType: UploadAssetType;
  thumbnailMode: "existing" | "placeholder" | "none";
  status: UploadJobStatus;
};

export type ContentPipelineConfig = {
  supports: UploadAssetType[];
  steps: PipelineStep[];
  cleanupAfterUpload: boolean;
};

export function createContentPipelineConfig(
  supports: UploadAssetType[],
  steps: PipelineStep[]
): ContentPipelineConfig {
  return {
    supports,
    steps,
    cleanupAfterUpload: true
  };
}

export function createMockUploadJob(
  fileName: string,
  fileType: UploadAssetType,
  thumbnailMode: UploadJob["thumbnailMode"] = "placeholder"
): UploadJob {
  return {
    id: `${fileType}-${fileName}`.toLowerCase().replace(/\s+/g, "-"),
    fileName,
    fileType,
    thumbnailMode,
    status: "detected"
  };
}

export function formatSupportedTypes(types: UploadAssetType[]) {
  return types.map((type) => type.toUpperCase()).join(" • ");
}

