const express = require("express");
const { nowIso } = require("../lib");

const router = express.Router();

router.get("/", (_req, res) => {
  res.send("DealBuddy API is running successfully!");
});

router.get("/api/health", (_req, res) => {
  res.json({ ok: true, at: nowIso() });
});

module.exports = router;
