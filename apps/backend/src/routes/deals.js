const express = require("express");
const {
  db,
  FieldValue,
  DEALS_COLLECTION,
  DEAL_JOINS_COLLECTION,
  REVIEWS_COLLECTION,
  DEFAULT_DEAL_LIMIT,
  MAX_DEAL_LIMIT,
  asNumber,
  getCreatedMs,
  getSellerId,
  normalizeApprovalStatus,
  isExpiredDeal,
  sanitizeDealForResponse,
  requireAuth,
  requireRole,
  optionalAuth,
  getBuyerId,
  makeJoinDocId,
  validateAddress,
  isDeliveryMode,
  extractDealPayload,
  applyDealUpdate,
  toMillis,
} = require("../lib");

const router = express.Router();

router.get("/api/deals", async (req, res) => {
  try {
    const nowMs = Date.now();
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_DEAL_LIMIT;
    const fetchLimit = Math.min(limit * 5, MAX_DEAL_LIMIT);

    const snapshot = await db
      .collection(DEALS_COLLECTION)
      .where("status", "==", "active")
      .limit(fetchLimit)
      .get();

    const deals = snapshot.docs
      .map((doc) => sanitizeDealForResponse(doc))
      .filter((deal) => {
        if (isExpiredDeal(deal, nowMs)) return false;
        const approvalStatus = normalizeApprovalStatus(deal);
        return approvalStatus === "approved";
      })
      .sort((a, b) => getCreatedMs(b) - getCreatedMs(a))
      .slice(0, limit);

    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/deals/seller/:sellerId", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const dealsRef = db.collection(DEALS_COLLECTION);
    const snap = await dealsRef.where("sellerId", "==", sellerId).get();
    const list = snap.docs
      .map((doc) => sanitizeDealForResponse(doc))
      .sort((x, y) => getCreatedMs(y) - getCreatedMs(x));

    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/deals/:dealId", async (req, res) => {
  try {
    const { dealId } = req.params;
    const snap = await db.collection(DEALS_COLLECTION).doc(dealId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Deal not found" });
    }
    return res.json(sanitizeDealForResponse(snap));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/deals/create", async (req, res) => {
  try {
    const payload = extractDealPayload(req.body);
    const docRef = await db.collection(DEALS_COLLECTION).add(payload);
    return res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/deals", requireAuth, requireRole("seller", "admin"), async (req, res) => {
  try {
    const payload = extractDealPayload(req.body, req.user.uid);
    const docRef = await db.collection(DEALS_COLLECTION).add(payload);
    return res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch(
  "/api/deals/:dealId",
  requireAuth,
  requireRole("seller", "admin"),
  async (req, res) => {
    try {
      const { dealId } = req.params;
      const ref = db.collection(DEALS_COLLECTION).doc(dealId);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "Deal not found" });

      const data = snap.data() || {};
      const sellerId = getSellerId(data);
      const role = String(req.userProfile?.role || "").toLowerCase();
      if (role !== "admin" && sellerId && sellerId !== req.user.uid) {
        return res.status(403).json({ error: "Only owner can edit this deal" });
      }
      const approvalStatus = normalizeApprovalStatus(data);
      if (approvalStatus === "approved") {
        return res.status(400).json({ error: "Approved deal cannot be edited" });
      }

      const updates = applyDealUpdate(req.body);
      await ref.set(updates, { merge: true });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/api/deals/:dealId/submit",
  requireAuth,
  requireRole("seller", "admin"),
  async (req, res) => {
    try {
      const { dealId } = req.params;
      const ref = db.collection(DEALS_COLLECTION).doc(dealId);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "Deal not found" });

      const data = snap.data() || {};
      const sellerId = getSellerId(data);
      const role = String(req.userProfile?.role || "").toLowerCase();
      if (role !== "admin" && sellerId && sellerId !== req.user.uid) {
        return res.status(403).json({ error: "Only owner can submit this deal" });
      }

      await ref.set(
        {
          approvalStatus: "pending",
          lifecycleStatus: "pending",
          status: "pending",
          approved: false,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      await ref.collection("approvalEvents").add({
        action: "submitted",
        actorId: req.user.uid,
        actorRole: req.userProfile.role || "seller",
        createdAt: FieldValue.serverTimestamp(),
      });

      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
);

router.post("/api/deals/:dealId/view", async (req, res) => {
  try {
    const { dealId } = req.params;
    const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
    await dealRef.update({
      viewsCount: FieldValue.increment(1),
      lastViewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/deals/:dealId/join", optionalAuth, async (req, res) => {
  try {
    const { dealId } = req.params;
    const { joinTimeSeconds, deliveryAddress, paymentId } = req.body || {};
    const buyerId = getBuyerId(req);
    const joinRef = db.collection(DEAL_JOINS_COLLECTION).doc(makeJoinDocId(dealId, buyerId));

    await db.runTransaction(async (tx) => {
      const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
      const dealSnap = await tx.get(dealRef);
      if (!dealSnap.exists) throw new Error("Deal not found");
      const deal = dealSnap.data() || {};

      const currentJoins = asNumber(deal.currentJoins ?? deal.joinedUsers, 0);
      const minGroupSize = Math.max(1, asNumber(deal.minGroupSize ?? deal.minThreshold, 1));
      const thresholdReached = Boolean(deal.thresholdReachedAt) || currentJoins >= minGroupSize;
      if (thresholdReached) throw new Error("Minimum threshold reached");

      if (isDeliveryMode(deal.deliveryMode) && !validateAddress(deliveryAddress)) {
        throw new Error("Delivery address is required");
      }

      const nextJoins = currentJoins + 1;
      const updates = {
        currentJoins: nextJoins,
        joinedUsers: asNumber(deal.joinedUsers, currentJoins) + 1,
        updatedAt: FieldValue.serverTimestamp(),
      };

      const prevAvg = asNumber(deal.avgJoinTimeSeconds, 0);
      const prevCount = asNumber(deal.joinEventsCount, 0);
      if (Number.isFinite(Number(joinTimeSeconds))) {
        const joinSeconds = Number(joinTimeSeconds);
        const newAvg = Math.round((prevAvg * prevCount + joinSeconds) / (prevCount + 1));
        updates.avgJoinTimeSeconds = newAvg;
        updates.joinEventsCount = prevCount + 1;
      }

      if (nextJoins >= minGroupSize && !deal.thresholdReachedAt) {
        updates.thresholdReachedAt = FieldValue.serverTimestamp();
      }

      tx.set(
        joinRef,
        {
          dealId,
          buyerId,
          sellerId: getSellerId(deal) || "",
          joinStatus: "joined",
          joinedAt: FieldValue.serverTimestamp(),
          leftAt: null,
          deliveryMode: deal.deliveryMode || "",
          deliveryAddressSnapshot: deliveryAddress || null,
          paymentStatus: paymentId ? "authorized" : "pending",
          paymentId: paymentId || null,
          amount: asNumber(deal.discountPrice ?? deal.price, 0),
          currency: "INR",
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.update(dealRef, updates);
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post("/api/deals/:dealId/leave", optionalAuth, async (req, res) => {
  try {
    const { dealId } = req.params;
    const buyerId = getBuyerId(req);
    const joinRef = db.collection(DEAL_JOINS_COLLECTION).doc(makeJoinDocId(dealId, buyerId));

    await db.runTransaction(async (tx) => {
      const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
      const dealSnap = await tx.get(dealRef);
      if (!dealSnap.exists) throw new Error("Deal not found");
      const deal = dealSnap.data() || {};
      const currentJoins = asNumber(deal.currentJoins ?? deal.joinedUsers, 0);
      const nextJoins = Math.max(0, currentJoins - 1);

      tx.set(
        joinRef,
        {
          dealId,
          buyerId,
          joinStatus: "left",
          leftAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.update(dealRef, {
        currentJoins: nextJoins,
        leftCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.put("/api/deals/:dealId/review", requireAuth, requireRole("buyer", "admin"), async (req, res) => {
  try {
    const { dealId } = req.params;
    const rating = asNumber(req.body?.rating, 0);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating should be between 1 and 5" });
    }
    const comment = String(req.body?.comment || "").trim();
    const reviewRef = db.collection(DEALS_COLLECTION).doc(dealId).collection(REVIEWS_COLLECTION).doc(req.user.uid);
    const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);

    await db.runTransaction(async (tx) => {
      const [dealSnap, reviewSnap] = await Promise.all([tx.get(dealRef), tx.get(reviewRef)]);
      if (!dealSnap.exists) throw new Error("Deal not found");
      const deal = dealSnap.data() || {};
      const prevRating = reviewSnap.exists ? asNumber(reviewSnap.data()?.rating, 0) : 0;
      const ratingCount = asNumber(deal.ratingCount, 0);
      const ratingTotal = asNumber(deal.ratingTotal, 0);
      const nextCount = reviewSnap.exists ? ratingCount : ratingCount + 1;
      const nextTotal = reviewSnap.exists ? ratingTotal - prevRating + rating : ratingTotal + rating;
      const nextAvg = nextCount > 0 ? Number((nextTotal / nextCount).toFixed(2)) : 0;

      tx.set(
        reviewRef,
        {
          userId: req.user.uid,
          userName: req.userProfile?.displayName || req.user.email || "Buyer",
          rating,
          comment,
          createdAt: reviewSnap.exists
            ? reviewSnap.data()?.createdAt || FieldValue.serverTimestamp()
            : FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        dealRef,
        {
          ratingCount: nextCount,
          ratingTotal: nextTotal,
          ratingAvg: nextAvg,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.get("/api/deals/:dealId/reviews", async (req, res) => {
  try {
    const { dealId } = req.params;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;
    const snap = await db
      .collection(DEALS_COLLECTION)
      .doc(dealId)
      .collection(REVIEWS_COLLECTION)
      .limit(limit)
      .get();
    const list = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
