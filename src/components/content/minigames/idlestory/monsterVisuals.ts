import type { DatabaseMonster } from "./gameEngine";

export type MonsterVisualClass =
  | "slime"
  | "mushroom"
  | "beast"
  | "golem"
  | "spirit"
  | "dragon"
  | "robot"
  | "boss"
  | "default";

type VisualMonster = Partial<DatabaseMonster> & {
  spriteKey?: string;
  imageKey?: string;
  type?: string;
};

export function getMonsterVisualClass(
  monster: VisualMonster | null | undefined,
  options: { isBoss?: boolean; isElite?: boolean } = {}
): MonsterVisualClass {
  const seed = [
    monster?.spriteKey,
    monster?.imageKey,
    monster?.name,
    monster?.portrait,
    monster?.type
  ].filter(Boolean).join(" ").toLowerCase();

  if (options.isBoss || monster?.isBoss || monster?.type === "boss") return "boss";
  if (/dragon|drake|wyvern|balrog|firebird/.test(seed)) return "dragon";
  if (/robot|android|bot|security|laser|mechanic/.test(seed)) return "robot";
  if (/golem|stone|relic|guardian|block|statue|armor/.test(seed)) return "golem";
  if (/spirit|ghost|wisp|shade|specter|eye|void|curse|phantom/.test(seed)) return "spirit";
  if (/mush|spore|fungi|mushmom/.test(seed)) return "mushroom";
  if (/slime|bubbling|gel|toxic/.test(seed)) return "slime";
  if (/pig|boar|snail|fox|wolf|rat|beast|ligator|monkey|bear|cat/.test(seed)) return "beast";
  if (options.isElite || monster?.type === "elite") return "golem";
  return "default";
}
