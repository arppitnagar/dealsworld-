const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const shouldClearMetro =
  process.argv.includes("--clear") || process.env.CLEAR_METRO_CACHE === "1";
const mobileBackendUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const adminBackendUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL_WEB || "http://127.0.0.1:5000/api";

if (!mobileBackendUrl) {
  console.warn(
    [
      "EXPO_PUBLIC_API_BASE_URL is not set.",
      "Set it before start so buyer/seller mobile apps can call backend.",
      "Example (cmd):",
      "set EXPO_PUBLIC_API_BASE_URL=http://192.168.1.9:5000/api",
      "Example (PowerShell):",
      '$env:EXPO_PUBLIC_API_BASE_URL=\"http://192.168.1.9:5000/api\"',
    ].join("\n"),
  );
}

const commands = [
  {
    name: "admin-web",
    workspace: "apps/admin",
    script: "web",
    args: ["--port", "8082"],
    apiBaseUrl: adminBackendUrl,
    webApiBaseUrl: adminBackendUrl,
  },
  {
    name: "buyer-mobile",
    workspace: "apps/buyer",
    script: "start",
    args: ["--host", "lan", "--port", "8083"],
    apiBaseUrl: mobileBackendUrl,
  },
  {
    name: "seller-mobile",
    workspace: "apps/seller",
    script: "start",
    args: ["--host", "lan", "--port", "8084"],
    apiBaseUrl: mobileBackendUrl,
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
    EXPO_PUBLIC_API_BASE_URL: entry.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_API_BASE_URL_WEB:
      entry.webApiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL_WEB,
    // Avoid remote dependency metadata fetch issues (undici JSON parse errors).
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
    if (!child.killed) child.kill();
  });
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
