const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TARGET_DIRS = ["apps", "packages"];
const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build"]);
const ALLOW_FILES = new Set([
  path.join(ROOT, "packages", "shared", "theme", "theme.js"),
]);

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 36;
const ALLOWED_FONT_WEIGHTS = new Set([
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
]);

const FONT_SIZE_REGEX = /\bfontSize\s*:\s*([0-9]+)\b/g;
const FONT_WEIGHT_REGEX = /\bfontWeight\s*:\s*["']?([0-9]+)["']?\b/g;

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

function getLineInfo(text, index) {
  const until = text.slice(0, index);
  const line = until.split("\n").length;
  const col = index - until.lastIndexOf("\n");
  return { line, col };
}

const problems = [];

for (const dir of TARGET_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  const files = walk(abs);
  for (const file of files) {
    if (ALLOW_FILES.has(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    let match;

    while ((match = FONT_SIZE_REGEX.exec(text))) {
      const value = Number(match[1]);
      const lineInfo = getLineInfo(text, match.index);
      const lineText = text.split("\n")[lineInfo.line - 1] || "";
      if (lineText.includes("lint:ignore-typography")) continue;
      if (lineText.includes("theme.typography")) continue;
      if (lineText.includes("lint:ignore-spacing")) continue;
      if (value >= MIN_FONT_SIZE && value <= MAX_FONT_SIZE) continue;
      problems.push({
        file,
        line: lineInfo.line,
        prop: "fontSize",
        value,
      });
    }

    while ((match = FONT_WEIGHT_REGEX.exec(text))) {
      const value = String(match[1]);
      const lineInfo = getLineInfo(text, match.index);
      const lineText = text.split("\n")[lineInfo.line - 1] || "";
      if (lineText.includes("lint:ignore-typography")) continue;
      if (lineText.includes("theme.typography")) continue;
      if (ALLOWED_FONT_WEIGHTS.has(value)) continue;
      problems.push({
        file,
        line: lineInfo.line,
        prop: "fontWeight",
        value,
      });
    }
  }
}

if (problems.length) {
  console.error("Found non-standard typography values:");
  for (const issue of problems) {
    console.error(
      `- ${issue.file}:${issue.line} -> ${issue.prop}: ${issue.value}`,
    );
  }
  process.exit(1);
}

console.log("Typography check passed.");
