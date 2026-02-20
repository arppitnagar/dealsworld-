const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const shouldClearMetro =
  process.argv.includes("--clear") || process.env.CLEAR_METRO_CACHE === "1";

const commands = [
  {
    name: "admin",
    workspace: "apps/admin",
    script: "web",
    args: ["--port", "8082"],
  },
  {
    name: "buyer",
    workspace: "apps/buyer",
    script: "web",
    args: ["--port", "8083"],
  },
  {
    name: "seller",
    workspace: "apps/seller",
    script: "web",
    args: ["--port", "8084"],
  },
];

const children = [];

function buildArgs(entry) {
  const args = ["--workspace", entry.workspace, "run", entry.script, "--"];
  if (shouldClearMetro) {
    args.push("--clear");
  }
  args.push(...entry.args);
  return args;
}

function buildEnv(entry) {
  const nodeMajor = String(process.versions.node || "").split(".")[0] || "unknown";
  const cacheDir = path.join(
    process.cwd(),
    ".metro-cache",
    entry.name,
    `node-${nodeMajor}`,
  );
  fs.mkdirSync(cacheDir, { recursive: true });

  return {
    ...process.env,
    EXPO_NO_DEPENDENCY_VALIDATION:
      process.env.EXPO_NO_DEPENDENCY_VALIDATION || "1",
    TMP: cacheDir,
    TEMP: cacheDir,
    TMPDIR: cacheDir,
  };
}

commands.forEach((entry) => {
  const child = spawn("npm", buildArgs(entry), {
    shell: true,
    stdio: "inherit",
    env: buildEnv(entry),
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[${entry.name}] exited with code ${code}`);
    }
  });
});

const shutdown = () => {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill();
    }
  });
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
