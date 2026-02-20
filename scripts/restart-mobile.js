const { execSync, spawn } = require("child_process");

const APPS = {
  buyer: { workspace: "apps/buyer", port: 8083 },
  seller: { workspace: "apps/seller", port: 8084 },
};

const appName = String(process.argv[2] || "").toLowerCase();
const shouldClear = process.argv.includes("--clear");
const target = APPS[appName];

if (!target) {
  console.error(
    "Usage: node scripts/restart-mobile.js <buyer|seller> [--clear]",
  );
  process.exit(1);
}

function getListeningPidsOnWindows(port) {
  try {
    const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const pids = new Set();
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        if (!line.includes("LISTENING")) return;
        const tokens = line.split(/\s+/);
        const pid = Number(tokens[tokens.length - 1]);
        if (Number.isFinite(pid) && pid > 0) pids.add(pid);
      });
    return [...pids];
  } catch (_error) {
    return [];
  }
}

function getListeningPidsOnUnix(port) {
  try {
    const output = execSync(`lsof -ti tcp:${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split(/\r?\n/)
      .map((value) => Number(String(value || "").trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
  } catch (_error) {
    return [];
  }
}

function stopPids(pids) {
  pids.forEach((pid) => {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      } else {
        process.kill(pid, "SIGTERM");
      }
      console.log(`Stopped process ${pid}`);
    } catch (_error) {
      // No-op. Process may have exited already.
    }
  });
}

const pids =
  process.platform === "win32"
    ? getListeningPidsOnWindows(target.port)
    : getListeningPidsOnUnix(target.port);

if (pids.length > 0) {
  stopPids(pids);
}

const args = [
  "--workspace",
  target.workspace,
  "run",
  "start",
  "--",
  "--host",
  "lan",
  "--port",
  String(target.port),
];
if (shouldClear) args.push("--clear");

const child = spawn("npm", args, {
  shell: true,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
