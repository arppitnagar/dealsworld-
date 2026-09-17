const express = require("express");
const {
  db,
  FieldValue,
  APP_CONFIG_COLLECTION,
  VERSION_GATE_DOC_ID,
  VERSION_GATE_APPS,
  DEFAULT_MIN_APP_VERSIONS,
  requireAuth,
  requireRole,
} = require("../lib");

const router = express.Router();

// Shapes whatever is stored in Firestore into a predictable
// { buyer: { minVersion, latestVersion, updateUrl, message }, seller: {...} }
// response, filling in defaults for apps that have never been configured.
function normalizeVersionGate(data = {}) {
  const result = {};
  VERSION_GATE_APPS.forEach((app) => {
    const entry = data[app] && typeof data[app] === "object" ? data[app] : {};
    result[app] = {
      minVersion: String(entry.minVersion || DEFAULT_MIN_APP_VERSIONS[app] || "0.0.0"),
      latestVersion: entry.latestVersion ? String(entry.latestVersion) : null,
      updateUrl: entry.updateUrl ? String(entry.updateUrl) : "",
      message: entry.message ? String(entry.message) : "",
    };
  });
  return result;
}

// Public: every buyer/seller client checks this on launch (before login) to
// decide whether it must block itself with the force-update screen.
router.get("/api/app-config/version-gate", async (_req, res) => {
  try {
    const snap = await db
      .collection(APP_CONFIG_COLLECTION)
      .doc(VERSION_GATE_DOC_ID)
      .get();
    res.json(normalizeVersionGate(snap.exists ? snap.data() : {}));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin-only: lets support/ops raise the minimum supported version (or set
// an update link) without a backend deploy.
router.put(
  "/api/admin/app-config/version-gate",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const payload = normalizeVersionGate(req.body);
      await db
        .collection(APP_CONFIG_COLLECTION)
        .doc(VERSION_GATE_DOC_ID)
        .set(
          {
            ...payload,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: req.user.uid,
          },
          { merge: true },
        );
      res.json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

module.exports = router;
