const express = require("express");
const { requireAuth } = require("../lib");
const { renderNotification } = require("../notificationText");
const { normalizeLanguage } = require("../translation");

const router = express.Router();

// A client re-renders its notification list in the currently selected
// language by posting back each item's stored messageKey/messageVars/dealId
// (see pushNotification() in lib.js) - this runs the exact same template +
// Azure title-translation path used when the notification was first sent,
// just with a different target language. Notifications sent before
// messageKey existed have nothing to re-render from and are silently
// skipped; the client keeps whatever text it already has for those.
const MAX_ITEMS = 50;

router.post("/api/notifications/render", requireAuth, async (req, res) => {
  try {
    const lang = normalizeLanguage(req.body?.lang) || "en";
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, MAX_ITEMS) : [];

    const results = {};
    await Promise.all(
      items.map(async (item) => {
        if (!item?.id || !item?.messageKey) return;
        try {
          results[item.id] = await renderNotification(
            { key: item.messageKey, vars: item.vars || {} },
            lang,
            item.dealId || null,
          );
        } catch {
          // Unknown key (e.g. from a newer app version) - leave it out.
        }
      }),
    );

    return res.json({ lang, items: results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
