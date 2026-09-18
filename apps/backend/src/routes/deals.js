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
  getUserDisplayName,
  normalizeApprovalStatus,
  normalizeLifecycleStatus,
  isExpiredDeal,
  sanitizeDealForResponse,
  attachSellerNamesToDeals,
  maybeAssignDealCode,
  ensureDealCodes,
  requireAuth,
  requireRole,
  optionalAuth,
  getBuyerId,
  makeJoinDocId,
  validateAddress,
  isDeliveryMode,
  validateDealPublishability,
  extractDealPayload,
  applyDealUpdate,
  resolveTierPrice,
  assertSellerOwnsDeal,
  pushNotification,
  getNextSequence,
  formatSequenceCode,
  toMillis,
} = require("../lib");
const { maybeExpireDeal } = require("../expirySweep");

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

    const codedDeals = await ensureDealCodes(deals);
    const hydratedDeals = await attachSellerNamesToDeals(codedDeals);
    res.json(hydratedDeals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/deals/seller/:sellerId", requireAuth, requireRole("seller", "admin"), async (req, res) => {
  try {
    const { sellerId } = req.params;
    const requesterRole = String(req.userProfile?.role || "").toLowerCase();
    if (requesterRole !== "admin" && req.user.uid !== sellerId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const dealsRef = db.collection(DEALS_COLLECTION);
    const snap = await dealsRef.where("sellerId", "==", sellerId).get();
    const list = snap.docs
      .map((doc) => sanitizeDealForResponse(doc))
      .sort((x, y) => getCreatedMs(y) - getCreatedMs(x));
    const codedList = await ensureDealCodes(list);
    const hydratedList = await attachSellerNamesToDeals(codedList);
    return res.json(hydratedList);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Every deal the current buyer has an active join on, regardless of the
// deal's own status - unlike GET /api/deals (active-only), this is how a
// buyer keeps reaching a deal's details (and its dispatch/OTP flow) after
// the seller ends the campaign or it expires. Registered ahead of the
// generic GET /api/deals/:dealId below so this literal path wins the match.
router.get("/api/deals/joined", requireAuth, async (req, res) => {
  try {
    const joinsSnap = await db
      .collection(DEAL_JOINS_COLLECTION)
      .where("buyerId", "==", req.user.uid)
      .where("joinStatus", "==", "joined")
      .get();

    if (joinsSnap.empty) return res.json([]);

    const dealIds = [...new Set(joinsSnap.docs.map((doc) => doc.data().dealId).filter(Boolean))];
    const dealSnaps = await Promise.all(
      dealIds.map((id) => db.collection(DEALS_COLLECTION).doc(id).get()),
    );
    const expiryResults = await Promise.all(
      dealSnaps
        .filter((snap) => snap.exists)
        .map((snap) => maybeExpireDeal(snap.id, snap.data() || {})),
    );
    const expiredDealIds = new Set(
      dealSnaps
        .filter((snap) => snap.exists)
        .map((snap, index) => (expiryResults[index]?.expired ? snap.id : null))
        .filter(Boolean),
    );
    const refreshedSnaps = expiredDealIds.size
      ? await Promise.all([...expiredDealIds].map((id) => db.collection(DEALS_COLLECTION).doc(id).get()))
      : [];
    const refreshedById = new Map(refreshedSnaps.map((snap) => [snap.id, snap]));
    const deals = dealSnaps
      .filter((snap) => snap.exists)
      .map((snap) => sanitizeDealForResponse(refreshedById.get(snap.id) || snap))
      // A deal that never reached its minimum buyers is hidden from the
      // buyer entirely once it's expired (manually or automatically) - only
      // a payment-shortfall expiry (real money was collected and needs a
      // visible refund status) stays visible under "My Orders".
      .filter((deal) => deal.expiryReason !== "quorum_shortfall");
    const codedDeals = await ensureDealCodes(deals);
    const hydratedDeals = await attachSellerNamesToDeals(codedDeals);
    hydratedDeals.sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
    return res.json(hydratedDeals);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/deals/:dealId", async (req, res) => {
  try {
    const { dealId } = req.params;
    let snap = await db.collection(DEALS_COLLECTION).doc(dealId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Deal not found" });
    }
    const expiryResult = await maybeExpireDeal(dealId, snap.data() || {});
    if (expiryResult?.expired) {
      snap = await db.collection(DEALS_COLLECTION).doc(dealId).get();
    }
    const deal = sanitizeDealForResponse(snap);
    const dealCode = await maybeAssignDealCode(dealId, deal);
    if (dealCode) deal.dealCode = dealCode;
    const [hydratedDeal] = await attachSellerNamesToDeals([deal]);
    return res.json(hydratedDeal || deal);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/deals/create", async (req, res) => {
  try {
    const payload = extractDealPayload(req.body);
    const publishabilityError = validateDealPublishability(payload);
    if (publishabilityError) {
      return res.status(400).json({ error: publishabilityError });
    }
    payload.dealCode = formatSequenceCode("DEAL", await getNextSequence("deals"));
    const docRef = await db.collection(DEALS_COLLECTION).add(payload);
    return res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/deals", requireAuth, requireRole("seller", "admin"), async (req, res) => {
  try {
    const payload = extractDealPayload(req.body, req.user.uid);
    const publishabilityError = validateDealPublishability(payload);
    if (publishabilityError) {
      return res.status(400).json({ error: publishabilityError });
    }
    payload.dealCode = formatSequenceCode("DEAL", await getNextSequence("deals"));
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
      const publishabilityError = validateDealPublishability(data);
      if (publishabilityError) {
        return res.status(400).json({ error: publishabilityError });
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

    const result = await db.runTransaction(async (tx) => {
      const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
      const [dealSnap, joinSnap] = await Promise.all([tx.get(dealRef), tx.get(joinRef)]);
      if (!dealSnap.exists) throw new Error("Deal not found");
      const deal = dealSnap.data() || {};
      const joinData = joinSnap.exists ? joinSnap.data() || {} : {};
      const joinStatus = String(joinData.joinStatus || "").toLowerCase();
      const currentJoins = asNumber(deal.currentJoins ?? deal.joinedUsers, 0);

      // Idempotent join: do not increase counts if the same user is already joined.
      if (joinStatus === "joined") {
        return { alreadyJoined: true, currentJoins };
      }

      const minGroupSize = Math.max(1, asNumber(deal.minGroupSize ?? deal.minThreshold, 1));
      // Reaching minGroupSize no longer closes the deal to new joiners - it
      // only guarantees the deal will ship (see thresholdReachedAt below).
      // The seller can optionally cap the group with maxGroupSize; only that
      // cap blocks further joins, and it's re-checked live (not sticky) so a
      // spot freed up by someone leaving is joinable again.
      const maxGroupSizeRaw = deal.maxGroupSize;
      const maxGroupSize =
        maxGroupSizeRaw === null || maxGroupSizeRaw === undefined
          ? null
          : Math.max(minGroupSize, asNumber(maxGroupSizeRaw, minGroupSize));
      const dealFull = maxGroupSize !== null && currentJoins >= maxGroupSize;
      if (dealFull) throw new Error("This deal has reached its maximum buyers");

      if (isDeliveryMode(deal.deliveryMode) && !validateAddress(deliveryAddress)) {
        throw new Error("Delivery address is required");
      }

      const nextJoins = currentJoins + 1;
      const updates = {
        currentJoins: nextJoins,
        joinedUsers: nextJoins,
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
          paymentStatus: "unpaid",
          paymentId: paymentId || null,
          // The live tier price at the moment of joining - informational
          // only (the buyer hasn't paid yet). The actual charge is captured
          // separately at /pay time as paidAmount, since the tier - and
          // therefore the live price - can keep moving between join and pay.
          amount: resolveTierPrice(deal, nextJoins),
          currency: "INR",
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.update(dealRef, updates);
      return { joined: true, currentJoins: nextJoins };
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post("/api/deals/:dealId/leave", optionalAuth, async (req, res) => {
  try {
    const { dealId } = req.params;
    const buyerId = getBuyerId(req);
    const joinRef = db.collection(DEAL_JOINS_COLLECTION).doc(makeJoinDocId(dealId, buyerId));

    const result = await db.runTransaction(async (tx) => {
      const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
      const [dealSnap, joinSnap] = await Promise.all([tx.get(dealRef), tx.get(joinRef)]);
      if (!dealSnap.exists) throw new Error("Deal not found");
      const deal = dealSnap.data() || {};
      const joinData = joinSnap.exists ? joinSnap.data() || {} : {};
      const joinStatus = String(joinData.joinStatus || "").toLowerCase();
      const currentJoins = asNumber(deal.currentJoins ?? deal.joinedUsers, 0);

      // Idempotent leave: do not decrease counts if the user is not currently joined.
      if (joinStatus !== "joined") {
        return { alreadyLeft: true, currentJoins };
      }

      const deliveryStatus = String(joinData.deliveryStatus || "").toLowerCase();
      if (deliveryStatus === "in_transit" || deliveryStatus === "delivered") {
        throw new Error("Cannot leave a deal after it has been dispatched");
      }
      const paymentStatus = String(joinData.paymentStatus || "unpaid").toLowerCase();
      if (paymentStatus !== "unpaid") {
        throw new Error("Cannot leave a deal after payment has been made");
      }

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
        joinedUsers: nextJoins,
        leftCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { left: true, currentJoins: nextJoins };
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Temporary payment-hold flag (no real payment gateway yet, see the
// scenario spec above the delivery routes): the buyer "pays" the platform,
// which blocks the payment until delivery is confirmed (applyDeliveryConfirmation
// in lib.js releases it to the seller) or the deal expires/is expired early
// without shipping (expirySweep.js / expire-early below refund it back).
router.post("/api/deals/:dealId/pay", requireAuth, requireRole("buyer", "admin"), async (req, res) => {
  try {
    const { dealId } = req.params;
    const joinRef = db.collection(DEAL_JOINS_COLLECTION).doc(makeJoinDocId(dealId, req.user.uid));
    const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);

    const result = await db.runTransaction(async (tx) => {
      const [dealSnap, joinSnap] = await Promise.all([tx.get(dealRef), tx.get(joinRef)]);
      if (!dealSnap.exists || !joinSnap.exists) throw new Error("Deal not found");
      const deal = dealSnap.data() || {};
      const joinData = joinSnap.data() || {};

      if (String(joinData.joinStatus || "").toLowerCase() !== "joined") {
        throw new Error("You have not joined this deal");
      }
      if (!isDeliveryMode(deal.deliveryMode)) {
        throw new Error("Payment hold is not applicable to pickup deals");
      }
      const lifecycleStatus = normalizeLifecycleStatus(deal);
      const isDispatchedOrBeyond = Boolean(deal.dispatchStatus) && deal.dispatchStatus !== "pending";
      if (lifecycleStatus !== "active" || isExpiredDeal(deal) || isDispatchedOrBeyond) {
        throw new Error("This deal can no longer accept payment");
      }

      const paymentStatus = String(joinData.paymentStatus || "unpaid").toLowerCase();
      if (paymentStatus === "paid_blocked" || paymentStatus === "released_to_seller") {
        return { ok: true, alreadyPaid: true };
      }
      if (paymentStatus === "refunded_to_buyer") {
        throw new Error("Payment already finalized for this deal");
      }

      // Captured live, at the moment of payment, not frozen from join time -
      // the tier (and so the price) can keep dropping as more buyers join in
      // between. This is what actually gets held; any gap versus the deal's
      // eventual final tier price is trued up as a settlement refund when
      // the seller marks the deal completed (see /complete below).
      const currentJoins = asNumber(deal.currentJoins ?? deal.joinedUsers, 0);
      const paidAmount = resolveTierPrice(deal, currentJoins);

      tx.set(
        joinRef,
        {
          paymentStatus: "paid_blocked",
          paidAt: FieldValue.serverTimestamp(),
          paidAmount,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return { ok: true, sellerId: getSellerId(deal), title: deal.title || "your deal" };
    });

    if (!result.alreadyPaid && result.sellerId) {
      const buyerName = getUserDisplayName(req.userProfile || {}, req.user.email) || "A buyer";
      await pushNotification({
        userId: result.sellerId,
        type: "payment_blocked",
        title: "Payment received",
        body: `${buyerName} paid for "${result.title}". Payment is held until delivery is confirmed.`,
        meta: { dealId },
      });
    }

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post(
  "/api/deals/:dealId/complete",
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

        const lifecycleStatus = normalizeLifecycleStatus(deal);
        if (lifecycleStatus !== "active" || isExpiredDeal(deal)) {
          throw new Error("Only an active, non-expired deal can be marked completed");
        }
        const currentJoins = asNumber(deal.currentJoins ?? deal.joinedUsers, 0);
        const minGroupSize = Math.max(1, asNumber(deal.minGroupSize ?? deal.minThreshold, 1));
        const thresholdReached = Boolean(deal.thresholdReachedAt) || currentJoins >= minGroupSize;
        if (!thresholdReached) {
          throw new Error("Minimum required buyers have not joined yet");
        }
        if (isDeliveryMode(deal.deliveryMode)) {
          const allPaid = joinsSnap.docs.every((joinDoc) => {
            const ps = String((joinDoc.data() || {}).paymentStatus || "").toLowerCase();
            return ps === "paid_blocked" || ps === "released_to_seller";
          });
          if (!allPaid) {
            throw new Error("All buyers must complete payment before this deal can be marked completed");
          }
        }

        // Settlement: with dynamic tiered pricing, whatever a buyer paid at
        // /pay time may be higher than the tier the deal actually finished
        // at (more buyers kept joining afterward). Completion is the moment
        // the headcount is locked for good, so it's the right point to true
        // everyone up to the same final price rather than making them wait
        // for delivery - the gap goes back to them as an immediate refund.
        const settlementAdjustments = [];
        if (isDeliveryMode(deal.deliveryMode) && Array.isArray(deal.pricingTiers) && deal.pricingTiers.length) {
          const finalPrice = resolveTierPrice(deal, currentJoins);
          joinsSnap.docs.forEach((joinDoc) => {
            const data = joinDoc.data() || {};
            if (String(data.paymentStatus || "").toLowerCase() !== "paid_blocked") return;
            const paidAmount = asNumber(data.paidAmount ?? data.amount, finalPrice);
            const settledAmount = Math.min(paidAmount, finalPrice);
            const adjustment = Math.max(0, paidAmount - settledAmount);
            tx.set(
              joinDoc.ref,
              {
                settledAmount,
                priceAdjustment: adjustment,
                priceAdjustedAt: adjustment > 0 ? FieldValue.serverTimestamp() : data.priceAdjustedAt || null,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
            if (adjustment > 0 && data.buyerId) {
              settlementAdjustments.push({ buyerId: data.buyerId, adjustment });
            }
          });
        }

        tx.set(
          dealRef,
          {
            status: "completed",
            lifecycleStatus: "completed",
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        tx.set(dealRef.collection("lifecycleEvents").doc(), {
          action: "completed",
          actorId: req.user.uid,
          buyerCount: joinsSnap.size,
          createdAt: FieldValue.serverTimestamp(),
        });

        return {
          buyerIds: joinsSnap.docs.map((doc) => doc.data().buyerId).filter(Boolean),
          title: deal.title || "your deal",
          settlementAdjustments,
        };
      });

      await Promise.all([
        ...result.buyerIds.map((buyerId) =>
          pushNotification({
            userId: buyerId,
            type: "deal_completed",
            title: "Deal completed",
            body: `The seller marked "${result.title}" as completed. It will be dispatched shortly.`,
            meta: { dealId },
          }),
        ),
        ...result.settlementAdjustments.map(({ buyerId, adjustment }) =>
          pushNotification({
            userId: buyerId,
            type: "price_adjusted",
            title: "Price dropped!",
            body: `More buyers joined "${result.title}" - ₹${adjustment} has been refunded to you as the group price dropped.`,
            meta: { dealId },
          }),
        ),
      ]);

      return res.json({ ok: true });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  },
);

// Scenario 3: minimum buyers never joined - the seller can end the campaign
// early instead of waiting for its natural expiry, and any buyers who did
// block a payment get refunded immediately. Unlike a payment-shortfall
// expiry, this deal is hidden from buyers entirely (see the expiryReason
// filter in GET /api/deals/joined).
router.post(
  "/api/deals/:dealId/expire-early",
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

        const lifecycleStatus = normalizeLifecycleStatus(deal);
        if (lifecycleStatus !== "active") {
          throw new Error("Only an active deal can be expired early");
        }
        if (isExpiredDeal(deal)) {
          throw new Error("Deal has already reached its expiry date");
        }
        const currentJoins = asNumber(deal.currentJoins ?? deal.joinedUsers, 0);
        const minGroupSize = Math.max(1, asNumber(deal.minGroupSize ?? deal.minThreshold, 1));
        const thresholdReached = Boolean(deal.thresholdReachedAt) || currentJoins >= minGroupSize;
        if (thresholdReached) {
          throw new Error("Minimum buyers already joined — use Mark Completed instead");
        }

        const refundedBuyerIds = [];
        joinsSnap.docs.forEach((joinDoc) => {
          const data = joinDoc.data() || {};
          if (String(data.paymentStatus || "").toLowerCase() === "paid_blocked") {
            refundedBuyerIds.push(data.buyerId);
            tx.set(
              joinDoc.ref,
              {
                paymentStatus: "refunded_to_buyer",
                paymentReleasedAt: FieldValue.serverTimestamp(),
                paymentReleaseReason: "seller_manual_expire",
                refundedAmount: asNumber(data.paidAmount ?? data.amount, 0),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
          }
        });

        tx.set(
          dealRef,
          {
            status: "expired",
            lifecycleStatus: "expired",
            expiredAt: FieldValue.serverTimestamp(),
            expiryReason: "quorum_shortfall",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        tx.set(dealRef.collection("lifecycleEvents").doc(), {
          action: "expired",
          reason: "quorum_shortfall",
          via: "seller_manual",
          actorId: req.user.uid,
          refundedBuyerCount: refundedBuyerIds.length,
          createdAt: FieldValue.serverTimestamp(),
        });

        return {
          refundedBuyerIds,
          allBuyerIds: joinsSnap.docs.map((doc) => doc.data().buyerId).filter(Boolean),
          title: deal.title || "your deal",
        };
      });

      await Promise.all([
        ...result.allBuyerIds.map((buyerId) =>
          pushNotification({
            userId: buyerId,
            type: "deal_expired",
            title: "Deal ended",
            body: `"${result.title}" was ended by the seller before reaching enough buyers.`,
            meta: { dealId },
          }),
        ),
        ...result.refundedBuyerIds.map((buyerId) =>
          pushNotification({
            userId: buyerId,
            type: "payment_refunded",
            title: "Payment refunded",
            body: `Your held payment for "${result.title}" has been released back to you.`,
            meta: { dealId },
          }),
        ),
      ]);

      return res.json({ ok: true, refundedCount: result.refundedBuyerIds.length });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  },
);

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
