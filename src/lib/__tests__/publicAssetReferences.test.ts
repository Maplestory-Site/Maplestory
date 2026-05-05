import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src");
const publicRoot = path.join(projectRoot, "public");
const assetRefPattern = /["'`]((?:\/library|\/idlestory)\/[^"'`?#)]+)["'`]/g;
const nonAssetPattern = /[:${}]/;

function walkFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return /\.(ts|tsx|js|jsx|json)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe("public asset references", () => {
  it("all /library and /idlestory source references exist under public", () => {
    const missing = new Set<string>();
    const refs = new Set<string>();

    for (const file of walkFiles(sourceRoot)) {
      const text = fs.readFileSync(file, "utf8");
      let match: RegExpExecArray | null;
      while ((match = assetRefPattern.exec(text))) {
        if (!nonAssetPattern.test(match[1]) && !match[1].endsWith("/...") && path.extname(match[1]).length > 0) {
          refs.add(match[1]);
        }
      }
    }

    for (const ref of refs) {
      if (!fs.existsSync(path.join(publicRoot, ref))) {
        missing.add(ref);
      }
    }

    expect([...missing].sort()).toEqual([]);
  });
});
