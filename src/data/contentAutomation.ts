export type TelegramPostPreview = {
  id: string;
  label: string;
  message: string;
  published: string;
};

export type UploadAssetType = "video" | "pdf" | "epub" | "file";

export type PipelineStep = {
  id: string;
  title: string;
  description: string;
};

export type SyncedContentItem = {
  id: string;
  type: "upload" | "clip" | "stream" | "telegram";
  title: string;
  detail: string;
  published: string;
};

export const telegramPreviewPosts: TelegramPostPreview[] = [
  {
    id: "tg-1",
    label: "Latest alert",
    message: "New video is up. Boss prep, clean route, and the next push.",
    published: "8 min ago"
  },
  {
    id: "tg-2",
    label: "Stream ping",
    message: "Next stream is locked in. Progression, live calls, and boss attempts tonight.",
    published: "Today"
  },
  {
    id: "tg-3",
    label: "Fast drop",
    message: "Clip of the day is live. One fast moment worth the click.",
    published: "Yesterday"
  }
];

export const supportedUploadTypes: UploadAssetType[] = ["video", "pdf", "epub", "file"];

export const uploadPipelineSteps: PipelineStep[] = [
  {
    id: "detect",
    title: "Detect new files",
    description: "Watch for fresh videos, PDFs, EPUBs, and other drops."
  },
  {
    id: "attach",
    title: "Attach preview",
    description: "Use a real thumbnail when available or fall back to a clean placeholder."
  },
  {
    id: "send",
    title: "Send to Telegram",
    description: "Push the file, caption, and link to the channel feed."
  },
  {
    id: "cleanup",
    title: "Clear the queue",
    description: "Delete local temp files after a successful upload."
  }
];

export const syncedContentFeed: SyncedContentItem[] = [
  {
    id: "feed-1",
    type: "upload",
    title: "New upload synced",
    detail: "Boss prep guide pushed to site and Telegram.",
    published: "10 min ago"
  },
  {
    id: "feed-2",
    type: "clip",
    title: "Clip of the day updated",
    detail: "Featured moment rotated for the daily return hook.",
    published: "Today"
  },
  {
    id: "feed-3",
    type: "stream",
    title: "Live status checked",
    detail: "Stream status ready for Twitch embed handoff.",
    published: "Today"
  },
  {
    id: "feed-4",
    type: "telegram",
    title: "Telegram post prepared",
    detail: "Next alert card is ready to ship when automation goes live.",
    published: "Queued"
  }
];

