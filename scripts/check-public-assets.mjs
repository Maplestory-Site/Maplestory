import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["src"];
const publicRoots = ["/library/", "/idlestory/"];
const assetPattern = /["'`](\/(?:library|idlestory)\/[^"'`\s)]+)["'`]/g;
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".css"]);
const nonAssetPattern = /[:${}]/;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const references = new Set();

for (const sourceRoot of sourceRoots) {
  const sourceDir = path.join(root, sourceRoot);
  if (!fs.existsSync(sourceDir)) continue;
  for (const file of walk(sourceDir)) {
    const raw = fs.readFileSync(file, "utf8");
    let match;
    while ((match = assetPattern.exec(raw))) {
      const assetPath = match[1].split(/[?#]/)[0];
      if (
        publicRoots.some((prefix) => assetPath.startsWith(prefix)) &&
        !nonAssetPattern.test(assetPath) &&
        !assetPath.endsWith("/...") &&
        path.extname(assetPath).length > 0
      ) {
        references.add(assetPath);
      }
    }
  }
}

const missing = [...references].filter((assetPath) => !fs.existsSync(path.join(root, "public", assetPath)));

if (missing.length > 0) {
  console.error(`[assets] Missing ${missing.length} public asset references:`);
  for (const assetPath of missing.slice(0, 200)) {
    console.error(` - ${assetPath}`);
  }
  if (missing.length > 200) {
    console.error(` ...and ${missing.length - 200} more`);
  }
  process.exit(1);
}

console.log(`[assets] Verified ${references.size} /library and /idlestory public asset references.`);
