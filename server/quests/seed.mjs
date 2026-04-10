import { QUESTS_SOURCE_META } from "./config.mjs";

export const seededQuestFeed = {
  items: [],
  meta: {
    ...QUESTS_SOURCE_META,
    updatedAt: new Date(0).toISOString(),
    syncState: "seeded",
    itemCount: 0,
  },
};
