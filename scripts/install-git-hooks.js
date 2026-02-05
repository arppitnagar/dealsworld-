const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const hooksPath = path.join(root, ".githooks");

try {
  execSync(`git config core.hooksPath "${hooksPath}"`, { stdio: "inherit" });
  console.log("Git hooks path set to .githooks");
} catch (error) {
  console.error("Failed to set git hooks path.");
  process.exit(1);
}
