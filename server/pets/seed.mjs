import { PETS_SOURCE_META } from "./config.mjs";

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const sourceUrl = PETS_SOURCE_META.sourceUrl;

const petSeed = [
  ["Brown Kitty", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/6/66/MS_Brown_Kitty.png"],
  ["Brown Puppy", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/b/b1/MS_Brown_Puppy.png"],
  ["Black Kitty", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/9/90/MS_Black_Kitty.png"],
  ["Mini Kargo", "Robo / Mechanical", "https://cdn.wikimg.net/en/strategywiki/images/8/8a/MS_Mini_Kargo.png"],
  ["Rudolph", "Holiday / Event", "https://cdn.wikimg.net/en/strategywiki/images/5/53/MS_Rudolph.png"],
  ["Dasher", "Holiday / Event", "https://cdn.wikimg.net/en/strategywiki/images/0/0d/MS_Dasher.png"],
  ["Husky", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/a/a4/MS_Husky.png"],
  ["Black Pig", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/0/09/MS_Black_Pig.png"],
  ["White Bunny", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/7/77/MS_White_Bunny.png"],
  ["Pink Bunny", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/a/ab/MS_Pink_Bunny.png"],
  ["Panda", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/f/f6/MS_Panda.png"],
  ["Dino Boy", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/4/4b/MS_Dino_Boy.png"],
  ["Dino Girl", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/f/f5/MS_Dino_Girl.png"],
  ["White Tiger", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/8/84/MS_White_Tiger.png"],
  ["Monkey", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/4/4d/MS_Monkey.png"],
  ["Turkey", "Holiday / Event", "https://cdn.wikimg.net/en/strategywiki/images/d/df/MS_Turkey.png"],
  ["Penguin", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/4/4f/MS_Penguin.png"],
  ["Robot", "Robo / Mechanical", "https://cdn.wikimg.net/en/strategywiki/images/5/56/MS_Robot.png"],
  ["Mini Yeti", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/0/03/MS_Mini_Yeti.png"],
  ["Jr. Balrog", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/5/56/MS_Jr._Balrog.png"],
  ["Golden Pig", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/7/74/MS_Golden_Pig.png"],
  ["Elephant", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/a/a7/MS_Elephant.png"],
  ["Cloud Leopard", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/3/32/MS_Cloud_Leopard.png"],
  ["Sun Wu Kong", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/2/2f/MS_Sun_Wu_Kong.png"],
  ["Dragon Egg", "Dragon Line", "https://cdn.wikimg.net/en/strategywiki/images/4/4e/MS_Dragon_Egg.png"],
  ["Baby Dragon", "Dragon Line", "https://cdn.wikimg.net/en/strategywiki/images/2/2a/MS_Baby_Dragon.png"],
  ["Black Dragon", "Dragon Line", "https://cdn.wikimg.net/en/strategywiki/images/8/84/MS_Black_Dragon.png"],
  ["Red Dragon", "Dragon Line", "https://cdn.wikimg.net/en/strategywiki/images/f/ff/MS_Red_Dragon.png"],
  ["Green Dragon", "Dragon Line", "https://cdn.wikimg.net/en/strategywiki/images/e/ec/MS_Green_Dragon.png"],
  ["Blue Dragon", "Dragon Line", "https://cdn.wikimg.net/en/strategywiki/images/f/fb/MS_Blue_Dragon.png"],
  ["Farm Pig", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/c/c3/MS_Farm_Pig.png"],
  ["Black Bunny", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/1/1f/MS_Black_Bunny.png"],
  ["Blue Husky", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/7/75/MS_Blue_Husky.png"],
  ["White Baby Monkey", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/d/d5/MS_White_Baby_Monkey.png"],
  ["Jr. Reaper", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/d/d5/MS_Jr._Reaper.png"],
  ["Porcupine", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/1/1c/MS_Porcupine.png"],
  ["Snowman", "Holiday / Event", "https://cdn.wikimg.net/en/strategywiki/images/3/3e/MS_Snowman.png"],
  ["Kino", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/e/e6/MS_Kino.png"],
  ["Skunk", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/d/d4/MS_Skunk.png"],
  ["Orange Tiger", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/4/43/MS_Orange_Tiger.png"],
  ["Robo", "Robo / Mechanical", "https://cdn.wikimg.net/en/strategywiki/images/9/9c/MS_Robo.png"],
  ["Baby Robo", "Robo / Mechanical", "https://cdn.wikimg.net/en/strategywiki/images/d/d1/MS_Baby_Robo.png"],
  ["Blue Robo", "Robo / Mechanical", "https://cdn.wikimg.net/en/strategywiki/images/5/5d/MS_Blue_Robo.png"],
  ["Green Robo", "Robo / Mechanical", "https://cdn.wikimg.net/en/strategywiki/images/a/a0/MS_Green_Robo.png"],
  ["Red Robo", "Robo / Mechanical", "https://cdn.wikimg.net/en/strategywiki/images/a/a5/MS_Red_Robo.png"],
  ["Gold Robo", "Robo / Mechanical", "https://cdn.wikimg.net/en/strategywiki/images/a/aa/MS_Gold_Robo.png"],
  ["Gorilla Robo", "Robo / Mechanical", "https://cdn.wikimg.net/en/strategywiki/images/0/0d/MS_Gorilla_Robo.png"],
  ["Snail", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/d/df/MS_Snail.png"],
  ["Crystal Rudolph", "Holiday / Event", "https://cdn.wikimg.net/en/strategywiki/images/8/8d/MS_Crystal_Rudolph.png"],
  ["Toucan", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/6/6c/MS_Toucan.png"],
  ["White Duck", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/5/57/MS_White_Duck.png"],
  ["Pink Bean", "Holiday / Event", "https://cdn.wikimg.net/en/strategywiki/images/7/74/MS_Pink_Bean.png"],
  ["Raccoon", "Classic Companions", "https://cdn.wikimg.net/en/strategywiki/images/d/de/MS_Raccoon.png"],
  ["Ninja", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/7/7d/MS_Ninja.png"],
  ["Baby Tiger", "Special / Fantasy", "https://cdn.wikimg.net/en/strategywiki/images/2/20/MS_Baby_Tiger.png"],
  ["Weird Alien", "Holiday / Event", "https://cdn.wikimg.net/en/strategywiki/images/e/e0/MS_Weird_Alien.png"],
  ["Mir", "Dragon Line", "https://cdn.wikimg.net/en/strategywiki/images/5/5a/MS_Mir.png"],
  ["Ruby", "Dragon Line", "https://cdn.wikimg.net/en/strategywiki/images/5/53/MS_Ruby.png"],
  ["Bing Monkey", "Holiday / Event", "https://cdn.wikimg.net/en/strategywiki/images/1/18/MS_Bing_Monkey.png"],
];

function getTags(category, name) {
  const tags = [category];
  if (category === "Dragon Line") tags.push("Dragon");
  if (category === "Robo / Mechanical") tags.push("Mechanical");
  if (category === "Holiday / Event") tags.push("Event");
  if (/Kitty|Puppy|Bunny|Tiger|Monkey|Raccoon|Duck|Toucan|Leopard|Pig|Panda|Husky|Snail|Elephant/i.test(name)) {
    tags.push("Companion");
  }
  return tags;
}

export const seededPetFeed = {
  items: petSeed.map(([name, category, image]) => ({
    id: slugify(name),
    name,
    category,
    image,
    summary: `${name} is a ${category.toLowerCase()} pet from the MapleStory pet collection.`,
    tags: getTags(category, name),
    sourceUrl,
  })),
  meta: {
    ...PETS_SOURCE_META,
    updatedAt: new Date(0).toISOString(),
    syncState: "seeded",
    itemCount: petSeed.length,
  },
};
