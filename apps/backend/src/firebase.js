const admin = require("firebase-admin");

// Local dev uses the real gitignored key file; hosted deploys (no file in
// the repo) set FIREBASE_SERVICE_ACCOUNT_JSON instead, either as raw JSON
// or base64-encoded JSON (base64 avoids fighting the host's env var UI over
// newlines/quotes in the private key).
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return require("../serviceAccountKey.json");
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(json);
}

admin.initializeApp({
  credential: admin.credential.cert(loadServiceAccount()),
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

module.exports = { admin, db, FieldValue };
