const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TARGET_DIRS = ["apps", "packages"];
const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build"]);
const ALLOW_FILES = new Set([
  path.join(ROOT, "packages", "shared", "theme", "theme.js"),
  path.join(ROOT, "packages", "shared", "components", "SkeletonBlock.js"),
]);

const HEX_REGEX = /#[0-9A-Fa-f]{3,6}\b/g;
const RGBA_REGEX = /rgba?\([^)]+\)/g;

function walk(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(fullPath, results);
    } else if (entry.isFile()) {
      if (EXTENSIONS.has(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const hex = text.match(HEX_REGEX) || [];
  const rgba = text.match(RGBA_REGEX) || [];
  return hex.concat(rgba);
}

const problems = [];

for (const dir of TARGET_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  const files = walk(abs);
  for (const file of files) {
    const matches = scanFile(file);
    if (matches.length) {
      if (ALLOW_FILES.has(file)) continue;
      problems.push({ file, matches });
    }
  }
}

if (problems.length) {
  console.error("Found hardcoded colors:");
  for (const { file, matches } of problems) {
    console.error(`- ${file}`);
    console.error(`  ${matches.slice(0, 10).join(", ")}${matches.length > 10 ? "..." : ""}`);
  }
  process.exit(1);
}

console.log("No hardcoded colors found in apps/ or packages/.");
