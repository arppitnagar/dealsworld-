const express = require("express");
const {
  db,
  FieldValue,
  DEALS_COLLECTION,
  DEAL_JOINS_COLLECTION,
  USERS_COLLECTION,
  asNumber,
  getSellerId,
  getUserDisplayName,
  ensureUserProfile,
  isDeliveryMode,
  isExpiredDeal,
  requireAuth,
  requireRole,
  makeJoinDocId,
  pushNotification,
  assertSellerOwnsDeal,
  applyDeliveryConfirmation,
  generateSixDigitOtp,
  MAX_OTP_ATTEMPTS,
} = require("../lib");

const router = express.Router();

// Bulk delivery/payment-status lookup for the buyer's own joined deals, used
// by list screens (Home/Deals/Search) to render an "In Transit"/"Delivered"
// badge without an N+1 request per card, and by DealsScreen.js to decide
// whether a paid-but-still-active deal belongs in "My Orders" instead of
// "Joined" (see dealCategories.js isDealPaymentPending). Registered ahead of
// deals.js's generic GET /api/deals/:dealId so this literal path is matched
// first.
router.get("/api/deals/my-deliveries", requireAuth, async (req, res) => {
  try {
    const snap = await db
      .collection(DEAL_JOINS_COLLECTION)
      .where("buyerId", "==", req.user.uid)
      .where("joinStatus", "==", "joined")
      .get();

    const result = {};
    snap.docs.forEach((doc) => {
      const data = doc.data() || {};
      result[data.dealId] = {
        deliveryStatus: data.deliveryStatus || null,
        deliveredAt: data.deliveredAt || null,
        paymentStatus: data.paymentStatus || "unpaid",
        paidAt: data.paidAt || null,
      };
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post(
  "/api/deals/:dealId/dispatch",
  requireAuth,
  requireRole("seller", "admin"),
  async (req, res) => {
    try {
      const { dealId } = req.params;
      const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
      const joinsQuery = db
        .collection(DEAL_JOINS_COLLECTION)
        .where("dealId", "==", dealId)
        .where("joinStatus", "==", "joined");

      const result = await db.runTransaction(async (tx) => {
        const [dealSnap, joinsSnap] = await Promise.all([tx.get(dealRef), tx.get(joinsQuery)]);
        if (!dealSnap.exists) throw new Error("Deal not found");
        const deal = dealSnap.data() || {};

        assertSellerOwnsDeal(deal, req);

        const status = String(deal.status || deal.lifecycleStatus || "").toLowerCase();
        if (status !== "completed" && !isExpiredDeal(deal)) {
          throw new Error("Deal must be completed or expired before it can be dispatched");
        }
        if (!isDeliveryMode(deal.deliveryMode)) {
          throw new Error("Pickup deals cannot be dispatched");
        }
        const currentJoins = asNumber(deal.currentJoins ?? deal.joinedUsers, 0);
        const minGroupSize = Math.max(1, asNumber(deal.minGroupSize ?? deal.minThreshold, 1));
        const thresholdReached = Boolean(deal.thresholdReachedAt) || currentJoins >= minGroupSize;
        if (!thresholdReached) {
          throw new Error("Minimum required buyers have not joined yet");
        }
        const allPaid = joinsSnap.docs.every((joinDoc) => {
          const ps = String((joinDoc.data() || {}).paymentStatus || "").toLowerCase();
          return ps === "paid_blocked" || ps === "released_to_seller";
        });
        if (!allPaid) {
          throw new Error("All joined buyers must complete payment before this deal can be dispatched");
        }
        if (deal.dispatchStatus && deal.dispatchStatus !== "pending") {
          throw new Error("Deal has already been dispatched");
        }
        if (joinsSnap.empty) {
          throw new Error("No joined buyers to dispatch to");
        }

        const usedCodes = new Set();
        const buyerIds = [];
        joinsSnap.docs.forEach((joinDoc) => {
          let otp = generateSixDigitOtp();
          while (usedCodes.has(otp)) otp = generateSixDigitOtp();
          usedCodes.add(otp);

          const joinData = joinDoc.data() || {};
          buyerIds.push(joinData.buyerId);
          tx.set(
            joinDoc.ref,
            {
              deliveryStatus: "in_transit",
              deliveryOtp: otp,
              deliveryOtpAttempts: 0,
              deliveryOtpLockedAt: null,
              deliveryDispatchedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        });

        tx.set(
          dealRef,
          {
            dispatchStatus: "dispatched",
            dispatchedAt: FieldValue.serverTimestamp(),
            deliveredCount: 0,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        tx.set(dealRef.collection("deliveryEvents").doc(), {
          action: "dispatched",
          actorId: req.user.uid,
          buyerCount: buyerIds.length,
          createdAt: FieldValue.serverTimestamp(),
        });

        return { buyerIds, title: deal.title || "" };
      });

      await Promise.all(
        result.buyerIds.map((buyerId) =>
          pushNotification({
            userId: buyerId,
            type: "deal_dispatched",
            message: { key: "dispatched", vars: { title: result.title } },
            meta: { dealId },
          }),
        ),
      );

      return res.json({ ok: true, dispatchedCount: result.buyerIds.length });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  },
);

// Scoped to the caller's own join record — a buyer can never see another
// buyer's OTP through this endpoint.
router.get("/api/deals/:dealId/my-delivery", requireAuth, async (req, res) => {
  try {
    const { dealId } = req.params;
    const joinRef = db.collection(DEAL_JOINS_COLLECTION).doc(makeJoinDocId(dealId, req.user.uid));
    const snap = await joinRef.get();
    if (!snap.exists) return res.json({ joined: false });

    const data = snap.data() || {};
    if (String(data.joinStatus || "").toLowerCase() !== "joined") {
      return res.json({ joined: false });
    }

    const deliveryStatus = data.deliveryStatus || null;
    return res.json({
      joined: true,
      deliveryStatus,
      deliveryOtp: deliveryStatus === "in_transit" ? data.deliveryOtp || null : null,
      pickupQrToken: deliveryStatus === "ready_for_pickup" ? data.pickupQrToken || null : null,
      deliveryDispatchedAt: data.deliveryDispatchedAt || null,
      deliveredAt: data.deliveredAt || null,
      otpLocked: Boolean(data.deliveryOtpLockedAt),
      attemptsRemaining: Math.max(0, MAX_OTP_ATTEMPTS - asNumber(data.deliveryOtpAttempts, 0)),
      paymentStatus: data.paymentStatus || "unpaid",
      paidAt: data.paidAt || null,
      paymentReleasedAt: data.paymentReleasedAt || null,
      // paidAmount: captured live at /pay time. settledAmount/priceAdjustment:
      // only set once the deal's tiered-pricing settlement step has run (see
      // /complete in routes/deals.js) - null until then, or for a deal that
      // was never tiered.
      paidAmount: data.paidAmount ?? null,
      settledAmount: data.settledAmount ?? null,
      priceAdjustment: data.priceAdjustment ?? null,
      refundedAmount: data.refundedAmount ?? null,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post(
  "/api/deals/:dealId/confirm-delivery",
  requireAuth,
  requireRole("buyer", "admin"),
  async (req, res) => {
    try {
      const { dealId } = req.params;
      const submittedOtp = String(req.body?.otp || "").trim();
      const joinRef = db.collection(DEAL_JOINS_COLLECTION).doc(makeJoinDocId(dealId, req.user.uid));
      const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);

      const result = await db.runTransaction(async (tx) => {
        const [joinSnap, dealSnap] = await Promise.all([tx.get(joinRef), tx.get(dealRef)]);
        if (!joinSnap.exists || !dealSnap.exists) throw new Error("Deal not found");
        const joinData = joinSnap.data() || {};
        const deal = dealSnap.data() || {};

        if (String(joinData.joinStatus || "").toLowerCase() !== "joined") {
          throw new Error("You have not joined this deal");
        }
        if (joinData.deliveryStatus === "delivered") {
          return { alreadyDelivered: true };
        }
        if (joinData.deliveryStatus !== "in_transit") {
          throw new Error("This deal hasn't been dispatched yet");
        }
        if (joinData.deliveryOtpLockedAt) {
          const error = new Error("Too many incorrect attempts. Ask the seller to confirm delivery manually.");
          error.status = 403;
          throw error;
        }

        if (!submittedOtp || submittedOtp !== joinData.deliveryOtp) {
          const attempts = asNumber(joinData.deliveryOtpAttempts, 0) + 1;
          const updates = {
            deliveryOtpAttempts: attempts,
            updatedAt: FieldValue.serverTimestamp(),
          };
          if (attempts >= MAX_OTP_ATTEMPTS) {
            updates.deliveryOtpLockedAt = FieldValue.serverTimestamp();
          }
          tx.set(joinRef, updates, { merge: true });

          const remaining = Math.max(0, MAX_OTP_ATTEMPTS - attempts);
          throw new Error(
            remaining > 0
              ? `Incorrect code. ${remaining} attempt(s) remaining.`
              : "Incorrect code. Too many attempts — ask the seller to confirm delivery manually.",
          );
        }

        const { rollupComplete } = applyDeliveryConfirmation(tx, {
          dealRef,
          deal,
          joinRef,
          joinData,
          via: "otp",
        });

        tx.set(dealRef.collection("deliveryEvents").doc(), {
          action: "delivered",
          buyerId: req.user.uid,
          via: "otp",
          createdAt: FieldValue.serverTimestamp(),
        });

        return {
          delivered: true,
          rollupComplete,
          sellerId: getSellerId(deal),
          title: deal.title || "",
        };
      });

      if (result.alreadyDelivered) {
        return res.json({ ok: true, alreadyDelivered: true });
      }

      const buyerName = getUserDisplayName(req.userProfile || {}, req.user.email);
      await pushNotification({
        userId: result.sellerId,
        type: "delivery_confirmed",
        message: { key: "deliveryConfirmed", vars: { buyer: buyerName, title: result.title } },
        meta: { dealId },
      });
      if (result.rollupComplete) {
        await pushNotification({
          userId: result.sellerId,
          type: "deal_all_delivered",
          message: { key: "allDelivered", vars: { title: result.title } },
          meta: { dealId },
        });
      }

      return res.json({ ok: true, delivered: true });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  },
);

router.get(
  "/api/deals/:dealId/delivery-status",
  requireAuth,
  requireRole("seller", "admin"),
  async (req, res) => {
    try {
      const { dealId } = req.params;
      const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
      const dealSnap = await dealRef.get();
      if (!dealSnap.exists) return res.status(404).json({ error: "Deal not found" });
      const deal = dealSnap.data() || {};
      assertSellerOwnsDeal(deal, req);

      const joinsSnap = await db
        .collection(DEAL_JOINS_COLLECTION)
        .where("dealId", "==", dealId)
        .where("joinStatus", "==", "joined")
        .get();

      const buyerIds = joinsSnap.docs.map((doc) => doc.data().buyerId).filter(Boolean);
      const uniqueBuyerIds = [...new Set(buyerIds)];
      // Never fall back to the raw buyerId (an internal Firestore UID) for
      // display - ensureUserProfile backfills a buyerCode for any legacy
      // profile missing one (same self-healing pattern as maybeAssignDealCode),
      // so the worst case is the generic "Buyer" label, not the UID. Batch
      // the common case (profile already complete) into one getAll() round
      // trip instead of one ensureUserProfile() read per joined buyer - for
      // a popular deal with thousands of joiners this was thousands of
      // individual reads on every poll.
      const profileById = new Map();
      if (uniqueBuyerIds.length) {
        const refs = uniqueBuyerIds.map((id) => db.collection(USERS_COLLECTION).doc(id));
        const snaps = await db.getAll(...refs);
        const needsBackfill = [];
        snaps.forEach((snap, index) => {
          const buyerId = uniqueBuyerIds[index];
          const data = snap.exists ? snap.data() || {} : null;
          const role = String(data?.role || "").toLowerCase();
          if (!data || !role || (role === "buyer" && !data.buyerCode)) {
            needsBackfill.push(buyerId);
          } else {
            profileById.set(buyerId, { id: buyerId, ...data });
          }
        });
        if (needsBackfill.length) {
          const backfilled = await Promise.all(
            needsBackfill.map((buyerId) => ensureUserProfile(buyerId)),
          );
          needsBackfill.forEach((buyerId, index) => {
            profileById.set(buyerId, backfilled[index]);
          });
        }
      }
      const namesById = new Map();
      const codesById = new Map();
      uniqueBuyerIds.forEach((buyerId) => {
        const profile = profileById.get(buyerId) || {};
        const buyerCode = profile.buyerCode || null;
        codesById.set(buyerId, buyerCode);
        namesById.set(buyerId, getUserDisplayName(profile, buyerCode || "Buyer"));
      });

      const items = joinsSnap.docs.map((doc) => {
        const data = doc.data() || {};
        return {
          buyerId: data.buyerId,
          buyerName: namesById.get(data.buyerId) || "Buyer",
          buyerCode: codesById.get(data.buyerId) || null,
          deliveryStatus: data.deliveryStatus || "awaiting_dispatch",
          deliveryDispatchedAt: data.deliveryDispatchedAt || null,
          deliveredAt: data.deliveredAt || null,
          paymentStatus: data.paymentStatus || "unpaid",
          paidAt: data.paidAt || null,
          // paidAmount: captured live at /pay time. settledAmount/
          // priceAdjustment: only set once the deal's tiered-pricing
          // settlement step has run (see /complete in routes/deals.js) -
          // null until then, or for a deal that was never tiered, in which
          // case the seller should just read paidAmount as the true amount.
          paidAmount: data.paidAmount ?? null,
          settledAmount: data.settledAmount ?? null,
          priceAdjustment: data.priceAdjustment ?? null,
        };
      });

      const allPaid = items.every(
        (item) => item.paymentStatus === "paid_blocked" || item.paymentStatus === "released_to_seller",
      );

      return res.json({
        ok: true,
        items,
        totalJoined: items.length,
        deliveredCount: asNumber(deal.deliveredCount, 0),
        allPaid,
        paidCount: items.filter(
          (item) => item.paymentStatus === "paid_blocked" || item.paymentStatus === "released_to_seller",
        ).length,
      });
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message });
    }
  },
);

// Seller-driven equivalent of confirm-delivery: instead of a buyer typing an
// OTP, the seller scans the buyer's pickup QR (apps/seller ScanQrScreen),
// which decodes to {dealId, buyerId, token}. No attempt-lock here like the
// OTP flow - a mis-scan just fails once, there's no realistic brute-force
// surface when the seller is the one holding the scanner.
router.post(
  "/api/deals/:dealId/confirm-pickup",
  requireAuth,
  requireRole("seller", "admin"),
  async (req, res) => {
    try {
      const { dealId } = req.params;
      const buyerId = String(req.body?.buyerId || "").trim();
      const submittedToken = String(req.body?.token || "").trim();
      if (!buyerId || !submittedToken) {
        return res.status(400).json({ error: "buyerId and token are required" });
      }

      const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
      const joinRef = db.collection(DEAL_JOINS_COLLECTION).doc(makeJoinDocId(dealId, buyerId));

      const result = await db.runTransaction(async (tx) => {
        const [dealSnap, joinSnap] = await Promise.all([tx.get(dealRef), tx.get(joinRef)]);
        if (!dealSnap.exists || !joinSnap.exists) throw new Error("Deal or buyer not found");
        const deal = dealSnap.data() || {};
        assertSellerOwnsDeal(deal, req);
        const joinData = joinSnap.data() || {};

        if (String(joinData.joinStatus || "").toLowerCase() !== "joined") {
          throw new Error("Buyer is not part of this deal");
        }
        if (joinData.deliveryStatus === "delivered") {
          return { alreadyDelivered: true, buyerId };
        }
        if (joinData.deliveryStatus !== "ready_for_pickup") {
          throw new Error("This buyer's order isn't ready for pickup yet");
        }
        if (!joinData.pickupQrToken || submittedToken !== joinData.pickupQrToken) {
          const error = new Error("Invalid or expired QR code");
          error.status = 400;
          throw error;
        }

        const { rollupComplete } = applyDeliveryConfirmation(tx, {
          dealRef,
          deal,
          joinRef,
          joinData,
          via: "qr_scan",
        });

        tx.set(dealRef.collection("deliveryEvents").doc(), {
          action: "delivered",
          buyerId,
          via: "qr_scan",
          actorId: req.user.uid,
          createdAt: FieldValue.serverTimestamp(),
        });

        return { delivered: true, rollupComplete, buyerId, title: deal.title || "" };
      });

      if (result.alreadyDelivered) {
        const profile = await ensureUserProfile(buyerId);
        return res.json({
          ok: true,
          alreadyDelivered: true,
          buyerName: getUserDisplayName(profile, profile.buyerCode || "Buyer"),
        });
      }

      const profile = await ensureUserProfile(buyerId);
      const buyerName = getUserDisplayName(profile, profile.buyerCode || "Buyer");

      await pushNotification({
        userId: buyerId,
        type: "pickup_confirmed",
        message: { key: "pickupConfirmed", vars: { title: result.title } },
        meta: { dealId },
      });

      return res.json({ ok: true, delivered: true, buyerName, title: result.title });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  },
);

router.post(
  "/api/deals/:dealId/delivery/:buyerId/mark-delivered",
  requireAuth,
  requireRole("seller", "admin"),
  async (req, res) => {
    try {
      const { dealId, buyerId } = req.params;
      const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
      const joinRef = db.collection(DEAL_JOINS_COLLECTION).doc(makeJoinDocId(dealId, buyerId));

      const result = await db.runTransaction(async (tx) => {
        const [dealSnap, joinSnap] = await Promise.all([tx.get(dealRef), tx.get(joinRef)]);
        if (!dealSnap.exists || !joinSnap.exists) throw new Error("Deal or buyer not found");
        const deal = dealSnap.data() || {};
        assertSellerOwnsDeal(deal, req);
        const joinData = joinSnap.data() || {};

        if (String(joinData.joinStatus || "").toLowerCase() !== "joined") {
          throw new Error("Buyer is not part of this deal");
        }
        if (joinData.deliveryStatus === "delivered") {
          return { alreadyDelivered: true };
        }
        if (joinData.deliveryStatus !== "in_transit" && joinData.deliveryStatus !== "ready_for_pickup") {
          throw new Error("This buyer's order isn't ready for delivery confirmation yet");
        }

        const { rollupComplete } = applyDeliveryConfirmation(tx, {
          dealRef,
          deal,
          joinRef,
          joinData,
          via: "seller_override",
        });

        tx.set(dealRef.collection("deliveryEvents").doc(), {
          action: "delivered",
          buyerId,
          via: "seller_override",
          actorId: req.user.uid,
          createdAt: FieldValue.serverTimestamp(),
        });

        return { delivered: true, rollupComplete, title: deal.title || "" };
      });

      if (result.alreadyDelivered) {
        return res.json({ ok: true, alreadyDelivered: true });
      }

      await pushNotification({
        userId: buyerId,
        type: "delivery_marked_by_seller",
        message: { key: "deliveryMarkedBySeller", vars: { title: result.title } },
        meta: { dealId },
      });

      return res.json({ ok: true, delivered: true });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  },
);

module.exports = router;
