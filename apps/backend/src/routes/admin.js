const express = require("express");
const {
  db,
  FieldValue,
  DEALS_COLLECTION,
  USERS_COLLECTION,
  MAX_DEAL_LIMIT,
  getCreatedMs,
  sanitizeDealForResponse,
  requireAuth,
  requireRole,
  getSellerId,
  pushNotification,
} = require("../lib");

const router = express.Router();

router.get("/api/admin/deals/pending", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const snap = await db
      .collection(DEALS_COLLECTION)
      .where("approvalStatus", "==", "pending")
      .limit(MAX_DEAL_LIMIT)
      .get();
    const list = snap.docs
      .map((doc) => sanitizeDealForResponse(doc))
      .sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/admin/deals/:dealId/approve", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { dealId } = req.params;
    const ref = db.collection(DEALS_COLLECTION).doc(dealId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Deal not found" });

    await ref.set(
      {
        approvalStatus: "approved",
        lifecycleStatus: "active",
        status: "active",
        approved: true,
        approval: {
          approvedBy: req.user.uid,
          approvedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await ref.collection("approvalEvents").add({
      action: "approved",
      actorId: req.user.uid,
      actorRole: "admin",
      createdAt: FieldValue.serverTimestamp(),
    });

    const deal = snap.data() || {};
    const sellerId = getSellerId(deal);
    await pushNotification({
      userId: sellerId,
      type: "deal_approved",
      title: "Deal approved",
      body: deal.title || "Your deal is approved",
      meta: { dealId },
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/admin/deals/:dealId/reject", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { dealId } = req.params;
    const reason = String(req.body?.reason || "").trim();
    const ref = db.collection(DEALS_COLLECTION).doc(dealId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Deal not found" });

    await ref.set(
      {
        approvalStatus: "rejected",
        lifecycleStatus: "rejected",
        status: "rejected",
        approved: false,
        approval: {
          rejectedBy: req.user.uid,
          rejectedAt: FieldValue.serverTimestamp(),
          rejectionReason: reason || "Rejected by admin",
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await ref.collection("approvalEvents").add({
      action: "rejected",
      actorId: req.user.uid,
      actorRole: "admin",
      reason: reason || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    const deal = snap.data() || {};
    const sellerId = getSellerId(deal);
    await pushNotification({
      userId: sellerId,
      type: "deal_rejected",
      title: "Deal rejected",
      body: reason || "Your deal was rejected by admin",
      meta: { dealId },
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/admin/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 100;
    const snap = await db.collection(USERS_COLLECTION).limit(limit).get();
    const list = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/api/admin/users/:uid", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = {};
    const allowed = ["role", "status", "displayName", "theme", "phone"];
    allowed.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    updates.updatedAt = FieldValue.serverTimestamp();
    await db.collection(USERS_COLLECTION).doc(uid).set(updates, { merge: true });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/admin/sellers/:sellerId/deals", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { sellerId } = req.params;
    const snap = await db
      .collection(DEALS_COLLECTION)
      .where("sellerId", "==", sellerId)
      .limit(MAX_DEAL_LIMIT)
      .get();
    const list = snap.docs
      .map((doc) => sanitizeDealForResponse(doc))
      .sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
