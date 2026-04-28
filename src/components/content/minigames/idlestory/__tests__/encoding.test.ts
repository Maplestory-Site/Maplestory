import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const IDLESTORY_ROOT = path.resolve(__dirname, "..");
const MINIGAMES_ROOT = path.resolve(IDLESTORY_ROOT, "..");

const ALLOWED_FILES = new Set(["textSanitizer.ts"]);

function collectFiles(dir: string, extensions: string[], skipDirs: string[] = []): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.includes(entry.name)) results.push(...collectFiles(fullPath, extensions, skipDirs));
      continue;
    }
    if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

const SOURCE_FILES: string[] = [
  ...collectFiles(IDLESTORY_ROOT, [".ts", ".tsx", ".css", ".json"], ["__tests__"]).filter(
    (f) => !ALLOWED_FILES.has(path.basename(f))
  ),
  ...fs
    .readdirSync(MINIGAMES_ROOT, { withFileTypes: true })
    .filter((e) => e.isFile() && [".ts", ".tsx", ".css", ".json"].some((ext) => e.name.endsWith(ext)))
    .map((e) => path.join(MINIGAMES_ROOT, e.name))
];

// Byte-pattern style detection (escaped only; no mojibake literals in source).
const BAD_ENCODING_PATTERNS: RegExp[] = [
  /\u00e2\u20ac[\u0090-\u00bf]/, // broken punctuation dashes/quotes family
  /\u00e2[\u0080-\u00bf]{2}/, // generic utf8-as-latin1 fragments
  /\u00c3[\u0080-\u00bf]/, // Ãx fragments
  /\u00c2[\u0080-\u00bf]/ // Âx fragments
];

describe("encoding - BOM detection", () => {
  it("no IdleStory source file starts with a UTF-8 BOM", () => {
    const offenders: string[] = [];
    for (const filePath of SOURCE_FILES) {
      const buf = fs.readFileSync(filePath);
      if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
        offenders.push(path.relative(IDLESTORY_ROOT, filePath));
      }
    }
    expect(offenders).toHaveLength(0);
  });
});

describe("encoding - mojibake detection", () => {
  it("no source file contains known encoding-garbage fragments", () => {
    const offenders: Array<{ file: string; line: number; pattern: string }> = [];
    for (const filePath of SOURCE_FILES) {
      const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const pattern of BAD_ENCODING_PATTERNS) {
          if (pattern.test(line)) {
            offenders.push({
              file: path.relative(IDLESTORY_ROOT, filePath),
              line: index + 1,
              pattern: pattern.source
            });
            break;
          }
        }
      });
    }
    expect(offenders).toHaveLength(0);
  });
});

describe("encoding - inventory sanity", () => {
  it("includes enough files for meaningful checks", () => {
    expect(SOURCE_FILES.length).toBeGreaterThanOrEqual(30);
  });
});
