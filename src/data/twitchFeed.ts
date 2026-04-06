import twitchStatusJson from "./twitchStatus.json";

type TwitchFeedShape = {
  login?: string;
  status?: "live" | "offline";
  viewerCount?: number;
  title?: string;
  gameName?: string;
  startedAt?: string;
  lastSynced?: string;
  source?: string;
};

const typedStatus = twitchStatusJson as TwitchFeedShape;

export const twitchChannelLogin = typedStatus.login || "snailslayermain";
export const twitchChannelUrl = `https://www.twitch.tv/${twitchChannelLogin}`;
export const twitchLastSynced = typedStatus.lastSynced || "";

export const twitchLiveStatus = typedStatus.status === "live" ? "live" : "offline";

export const twitchViewerCount =
  twitchLiveStatus === "live" && typeof typedStatus.viewerCount === "number" ? typedStatus.viewerCount : undefined;

export const twitchStreamTitle = typedStatus.title || "";
export const twitchGameName = typedStatus.gameName || "MapleStory";
