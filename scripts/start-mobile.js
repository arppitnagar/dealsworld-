#!/usr/bin/env node
// Thin wrapper around `expo start` for the buyer/seller/admin mobile apps.
//
// Problem it solves: each app's src/api/client.js falls back to a hardcoded
// backend IP when EXPO_PUBLIC_API_BASE_URL isn't set, and that IP goes stale
// the moment this machine's LAN address changes (new network, DHCP renewal,
// etc.), causing the app to hang on a white screen talking to a dead host.
//
// This script auto-detects the current LAN IPv4 address and exports
// EXPO_PUBLIC_API_BASE_URL from it before launching Expo, so a plain
// `npm run start` always points at the right backend. It only fills in the
// value when the caller hasn't already set one, and otherwise forwards every
// CLI argument straight through to `expo start` untouched.
const { spawnSync } = require("child_process");
const os = require("os");

function getLanIPv4() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs || []) {
      if (addr.family === "IPv4" && !addr.internal) {
        candidates.push({ name, address: addr.address });
      }
    }
  }
  // Prefer a Wi-Fi/Ethernet adapter over VPN/virtual ones when there's a choice.
  const preferred =
    candidates.find((c) => /wi-?fi|ethernet/i.test(c.name)) || candidates[0];
  return preferred ? preferred.address : null;
}

const env = { ...process.env };

if (!env.EXPO_PUBLIC_API_BASE_URL) {
  const ip = getLanIPv4();
  if (ip) {
    env.EXPO_PUBLIC_API_BASE_URL = `http://${ip}:5000/api`;
    console.log(
      `[start-mobile] EXPO_PUBLIC_API_BASE_URL not set - defaulting to http://${ip}:5000/api (auto-detected LAN IP)`,
    );
  } else {
    console.warn(
      "[start-mobile] Could not auto-detect a LAN IPv4 address. Set EXPO_PUBLIC_API_BASE_URL manually if the app can't reach the backend.",
    );
  }
}

// Skip Expo CLI's remote dependency-version check unless the caller opted in,
// see scripts/start-all-hybrid.js for the fuller explanation.
env.EXPO_OFFLINE = env.EXPO_OFFLINE || "1";

const result = spawnSync("npx", ["expo", "start", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env,
});

process.exit(result.status ?? 0);
