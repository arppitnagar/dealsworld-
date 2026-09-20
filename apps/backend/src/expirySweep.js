// Persists the "expired" lifecycle status that, before this file existed,
// was only ever computed on the fly (see lib.js isExpiredDeal). Handles
// scenario 2 from the delivery/payment spec: a deal whose minimum buyers
// joined but not everyone paid must, once its expiry date passes, flip to
// expired and release any held ("paid_blocked") buyer payments back to them.
// Run both periodically (runExpirySweep, wired into server.js) and lazily
// (maybeExpireDeal, called from routes/deals.js read routes) so a deal never
// shows a stale "active" state for long after it's actually due.
const {
  db,
  FieldValue,
  DEALS_COLLECTION,
  DEAL_JOINS_COLLECTION,
  asNumber,
  isExpiredDeal,
  getSellerId,
  normalizeLifecycleStatus,
  pushNotification,
} = require("./lib");

function isDispatchedOrBeyond(deal) {
  const dispatchStatus = String(deal.dispatchStatus || "").toLowerCase();
  return Boolean(dispatchStatus) && dispatchStatus !== "pending";
}

// Cheap, non-transactional check usable both to decide whether a sweep/lazy
// pass is worth opening a transaction for, and (re-checked) inside the
// transaction itself to guard against races with dispatch/complete/expire-early.
function isEligibleForAutoExpiry(deal, nowMs = Date.now()) {
  const lifecycleStatus = normalizeLifecycleStatus(deal);
  if (lifecycleStatus !== "active" && lifecycleStatus !== "pending") return false;
  if (!isExpiredDeal(deal, nowMs)) return false;
  // A dispatched deal's `status` field is never flipped away from "active"
  // by the dispatch endpoint, so without this guard the sweep would wrongly
  // reclassify an in-delivery deal as expired and refund its paid buyers.
  if (isDispatchedOrBeyond(deal)) return false;
  return true;
}

async function notifyExpiry(dealId, { sellerId, title, expiryReason, refundedBuyerIds }) {
  const tasks = [];
  if (sellerId) {
    tasks.push(
      pushNotification({
        userId: sellerId,
        type: "deal_expired",
        title: "Deal expired",
        body:
          expiryReason === "payment_shortfall"
            ? `"${title}" expired before all buyers completed payment. It has moved to Expired.`
            : `"${title}" expired without reaching enough buyers. It has moved to Expired.`,
        meta: { dealId },
      }),
    );
  }
  refundedBuyerIds.forEach((buyerId) => {
    tasks.push(
      pushNotification({
        userId: buyerId,
        type: "payment_refunded",
        title: "Payment refunded",
        body: `Your held payment for "${title}" has been released back to you because the deal expired.`,
        meta: { dealId },
      }),
    );
  });
  await Promise.all(tasks);
}

async function expireDealTransactional(dealId, { via = "sweep" } = {}) {
  const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
  const joinsQuery = db
    .collection(DEAL_JOINS_COLLECTION)
    .where("dealId", "==", dealId)
    .where("joinStatus", "==", "joined");

  const result = await db.runTransaction(async (tx) => {
    const [dealSnap, joinsSnap] = await Promise.all([tx.get(dealRef), tx.get(joinsQuery)]);
    if (!dealSnap.exists) return { skipped: true };
    const deal = dealSnap.data() || {};

    if (!isEligibleForAutoExpiry(deal, Date.now())) {
      return { skipped: true };
    }

    const currentJoins = asNumber(deal.currentJoins ?? deal.joinedUsers, 0);
    const minGroupSize = Math.max(1, asNumber(deal.minGroupSize ?? deal.minThreshold, 1));
    const thresholdReached = Boolean(deal.thresholdReachedAt) || currentJoins >= minGroupSize;

    const allPaid = joinsSnap.docs.every((joinDoc) => {
      const ps = String((joinDoc.data() || {}).paymentStatus || "").toLowerCase();
      return ps === "paid_blocked" || ps === "released_to_seller";
    });

    // Threshold reached and everyone paid: this deal is dispatch-ready, just
    // never actioned by the seller yet. Don't auto-expire/refund it - the
    // dispatch endpoint's isExpiredDeal() OR-branch already lets the seller
    // dispatch a fully-paid deal straight off its natural expiry.
    if (thresholdReached && allPaid) {
      return { skipped: true };
    }

    const expiryReason = thresholdReached ? "payment_shortfall" : "quorum_shortfall";
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
            paymentReleaseReason: `expired_${expiryReason}`,
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
        expiryReason,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    tx.set(dealRef.collection("lifecycleEvents").doc(), {
      action: "expired",
      reason: expiryReason,
      via,
      refundedBuyerCount: refundedBuyerIds.length,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      expired: true,
      expiryReason,
      refundedBuyerIds,
      sellerId: getSellerId(deal),
      title: deal.title || "your deal",
    };
  });

  if (result.expired) {
    await notifyExpiry(dealId, result);
  }
  return result;
}

// Thin wrapper for read routes (routes/deals.js) - only opens a transaction
// when the already-fetched doc looks due, and swallows errors so a failed
// opportunistic expiry never breaks the read it's piggybacking on.
async function maybeExpireDeal(dealId, deal, { via = "lazy" } = {}) {
  if (!isEligibleForAutoExpiry(deal, Date.now())) return null;
  try {
    return await expireDealTransactional(dealId, { via });
  } catch (error) {
    console.warn("maybeExpireDeal failed:", dealId, error.message || error);
    return null;
  }
}

async function runExpirySweep() {
  try {
    const snap = await db
      .collection(DEALS_COLLECTION)
      .where("status", "in", ["active", "pending"])
      .get();
    const nowMs = Date.now();
    const dueDealIds = snap.docs
      .filter((doc) => isEligibleForAutoExpiry(doc.data() || {}, nowMs))
      .map((doc) => doc.id);

    for (const dealId of dueDealIds) {
      try {
        await expireDealTransactional(dealId, { via: "sweep" });
      } catch (error) {
        console.warn("Expiry sweep failed for deal", dealId, error.message || error);
      }
    }
  } catch (error) {
    console.warn("Expiry sweep query failed:", error.message || error);
  }
}

module.exports = { expireDealTransactional, maybeExpireDeal, runExpirySweep };
