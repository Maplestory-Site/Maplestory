import { PETS_SOURCE_META } from "./config.mjs";
import { seededPetFeed } from "./seed.mjs";

let memoryFeed = null;

export async function getPetFeed() {
  if (memoryFeed) {
    return memoryFeed;
  }

  memoryFeed = {
    items: seededPetFeed.items,
    meta: {
      ...PETS_SOURCE_META,
      updatedAt: new Date().toISOString(),
      syncState: "synced",
      itemCount: seededPetFeed.items.length,
    },
  };

  return memoryFeed;
}
