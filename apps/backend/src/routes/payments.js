const express = require("express");
const {
  db,
  FieldValue,
  PAYMENTS_COLLECTION,
  PAYMENT_EVENTS_COLLECTION,
  DEALS_COLLECTION,
  asNumber,
  getSellerId,
  makeJoinDocId,
  makePaymentId,
  makeProviderOrderId,
  requireAuth,
  requireRole,
  ensureUserProfile,
} = require("../lib");

const router = express.Router();

router.post("/api/payments/intent", requireAuth, requireRole("buyer", "admin"), async (req, res) => {
  try {
    const dealId = String(req.body?.dealId || "").trim();
    if (!dealId) return res.status(400).json({ error: "dealId is required" });

    const amount = Math.max(0, asNumber(req.body?.amount, 0));
    const currency = String(req.body?.currency || "INR").toUpperCase();
    const provider = String(req.body?.provider || "mock").toLowerCase();

    const dealSnap = await db.collection(DEALS_COLLECTION).doc(dealId).get();
    if (!dealSnap.exists) return res.status(404).json({ error: "Deal not found" });
    const deal = dealSnap.data() || {};

    const paymentId = makePaymentId();
    const providerOrderId = makeProviderOrderId();

    const paymentPayload = {
      paymentId,
      provider,
      providerOrderId,
      providerPaymentId: null,
      dealId,
      joinId: makeJoinDocId(dealId, req.user.uid),
      buyerId: req.user.uid,
      sellerId: getSellerId(deal) || "",
      amount,
      currency,
      status: "created",
      failureCode: null,
      failureReason: null,
      capturedAt: null,
      refundedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await db.collection(PAYMENTS_COLLECTION).doc(paymentId).set(paymentPayload, { merge: true });

    return res.status(201).json({
      paymentId,
      provider,
      providerOrderId,
      clientSecret: `mock_${paymentId}`,
      status: "created",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/payments/:paymentId", requireAuth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const snap = await db.collection(PAYMENTS_COLLECTION).doc(paymentId).get();
    if (!snap.exists) return res.status(404).json({ error: "Payment not found" });
    const payment = { id: snap.id, ...(snap.data() || {}) };

    const profile = await ensureUserProfile(req.user.uid, {
      email: req.user.email || "",
    });
    const role = String(profile.role || "").toLowerCase();
    const canAccess =
      role === "admin" ||
      payment.buyerId === req.user.uid ||
      payment.sellerId === req.user.uid;
    if (!canAccess) return res.status(403).json({ error: "Forbidden" });

    return res.json(payment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/payments/webhook", async (req, res) => {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    const provided = req.headers["x-payment-webhook-secret"];
    if (secret && provided !== secret) {
      return res.status(401).json({ error: "Invalid webhook secret" });
    }

    const eventType = String(req.body?.eventType || req.body?.type || "").toLowerCase();
    const paymentId = String(req.body?.paymentId || "").trim();
    if (!paymentId) return res.status(400).json({ error: "paymentId is required" });

    const payloadHash = require("crypto")
      .createHash("sha256")
      .update(JSON.stringify(req.body || {}))
      .digest("hex");

    const eventRef = db.collection(PAYMENT_EVENTS_COLLECTION).doc();
    await eventRef.set({
      paymentId,
      eventType: eventType || "unknown",
      payloadHash,
      processingStatus: "processed",
      provider: String(req.body?.provider || "mock"),
      receivedAt: FieldValue.serverTimestamp(),
      processedAt: FieldValue.serverTimestamp(),
    });

    const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(paymentId);
    const updates = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (eventType.includes("authorize")) updates.status = "authorized";
    if (eventType.includes("capture") || eventType.includes("success")) {
      updates.status = "captured";
      updates.capturedAt = FieldValue.serverTimestamp();
    }
    if (eventType.includes("fail")) {
      updates.status = "failed";
      updates.failureCode = String(req.body?.failureCode || "");
      updates.failureReason = String(req.body?.failureReason || "");
    }
    if (eventType.includes("refund")) {
      updates.status = "refunded";
      updates.refundedAt = FieldValue.serverTimestamp();
    }
    await paymentRef.set(updates, { merge: true });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/payments/:paymentId/refund", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { paymentId } = req.params;
    const ref = db.collection(PAYMENTS_COLLECTION).doc(paymentId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Payment not found" });

    await ref.set(
      {
        status: "refunded",
        refundedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
