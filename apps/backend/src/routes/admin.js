const express = require("express");
const {
  db,
  FieldValue,
  DEALS_COLLECTION,
  USERS_COLLECTION,
  PAYMENTS_COLLECTION,
  MAX_DEAL_LIMIT,
  getCreatedMs,
  toMillis,
  asNumber,
  isExpiredDeal,
  sanitizeDealForResponse,
  normalizeUserApprovalStatus,
  attachSellerNamesToDeals,
  requireAuth,
  requireRole,
  invalidateUserProfileCache,
  getSellerId,
  validateDealPublishability,
  pushNotification,
  notifyBuyersOfNewDeal,
} = require("../lib");

const router = express.Router();

async function approveUserInternal(uid, actorUid) {
  const ref = db.collection(USERS_COLLECTION).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  await ref.set(
    {
      approvalStatus: "approved",
      status: "active",
      approval: {
        approvedBy: actorUid,
        approvedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  invalidateUserProfileCache(uid);

  const user = snap.data() || {};
  await pushNotification({
    userId: uid,
    type: "account_approved",
    message: {
      key:
        String(user.role || "").toLowerCase() === "seller"
          ? "accountApprovedSeller"
          : "accountApproved",
    },
    meta: { approvedBy: actorUid },
  });
}

async function rejectUserInternal(uid, actorUid, reasonRaw) {
  const reason = String(reasonRaw || "").trim();
  const ref = db.collection(USERS_COLLECTION).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  await ref.set(
    {
      approvalStatus: "rejected",
      status: "blocked",
      approval: {
        rejectedBy: actorUid,
        rejectedAt: FieldValue.serverTimestamp(),
        rejectionReason: reason || "Rejected by admin",
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  invalidateUserProfileCache(uid);

  await pushNotification({
    userId: uid,
    type: "account_rejected",
    // The admin's typed reason is sent as written, not translated.
    message: reason
      ? { key: "accountRejectedReason", vars: { reason } }
      : { key: "accountRejected" },
    meta: { rejectedBy: actorUid },
  });
}

// normalizeUserApprovalStatus treats a MISSING approvalStatus field on a
// seller profile as an implicit "pending" (legacy accounts predate the
// field). A single `where("approvalStatus","==","pending")` query can't see
// those, so we union it with a role-scoped scan for legacy sellers - scoped
// to sellers (a small subset of all users) rather than the whole USERS
// collection, so it stays cheap as the buyer base grows.
async function findPendingUsers({ roleFilter } = {}) {
  const byId = new Map();

  const explicitPendingSnap = await db
    .collection(USERS_COLLECTION)
    .where("approvalStatus", "==", "pending")
    .get();
  explicitPendingSnap.docs.forEach((doc) => {
    byId.set(doc.id, { id: doc.id, ...(doc.data() || {}) });
  });

  if (!roleFilter || roleFilter === "seller") {
    const sellerSnap = await db
      .collection(USERS_COLLECTION)
      .where("role", "==", "seller")
      .limit(5000)
      .get();
    sellerSnap.docs.forEach((doc) => {
      const data = doc.data() || {};
      if (data.approvalStatus) return; // explicit status already covered above
      byId.set(doc.id, { id: doc.id, ...data });
    });
  }

  return Array.from(byId.values())
    .map((user) => ({ ...user, approvalStatus: normalizeUserApprovalStatus(user) }))
    .filter((user) => {
      if (roleFilter && String(user.role || "").toLowerCase() !== roleFilter) return false;
      return String(user.approvalStatus || "").toLowerCase() === "pending";
    })
    .sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
}

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
    const hydratedList = await attachSellerNamesToDeals(list);
    return res.json(hydratedList);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/admin/deals", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 150;
    const approvalFilter = String(req.query.approvalStatus || "").trim().toLowerCase();
    const statusFilter = String(req.query.status || "").trim().toLowerCase();
    const sellerFilter = String(req.query.sellerId || "").trim();
    const searchQuery = String(req.query.q || "").trim().toLowerCase();

    // Use at most one indexed server-side filter first to reduce read volume.
    let query = db.collection(DEALS_COLLECTION);
    if (sellerFilter) {
      query = query.where("sellerId", "==", sellerFilter);
    } else if (approvalFilter) {
      query = query.where("approvalStatus", "==", approvalFilter);
    } else if (statusFilter) {
      query = query.where("lifecycleStatus", "==", statusFilter);
    }

    const snap = await query.limit(limit).get();
    let list = snap.docs
      .map((doc) => sanitizeDealForResponse(doc))
      .sort((a, b) => getCreatedMs(b) - getCreatedMs(a));

    if (approvalFilter) {
      list = list.filter(
        (deal) => String(deal.approvalStatus || "").toLowerCase() === approvalFilter,
      );
    }
    if (statusFilter) {
      list = list.filter((deal) => {
        const lifecycle = String(deal.lifecycleStatus || deal.status || "").toLowerCase();
        return lifecycle === statusFilter;
      });
    }
    if (sellerFilter) {
      list = list.filter((deal) => String(deal.sellerId || "") === sellerFilter);
    }
    if (searchQuery) {
      list = list.filter((deal) => {
        const haystack = [
          deal.id,
          deal.title,
          deal.description,
          deal.category,
          deal.location,
          deal.deliveryMode,
          deal.status,
          deal.lifecycleStatus,
          deal.approvalStatus,
          deal.sellerId,
        ]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        return haystack.includes(searchQuery);
      });
    }

    const hydratedList = await attachSellerNamesToDeals(list);
    return res.json(hydratedList);
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

    const deal = snap.data() || {};
    const publishabilityError = validateDealPublishability(deal);
    if (publishabilityError) {
      return res.status(400).json({ error: publishabilityError });
    }
    const sellerId = getSellerId(deal);
    if (sellerId) {
      const sellerSnap = await db.collection(USERS_COLLECTION).doc(sellerId).get();
      if (sellerSnap.exists) {
        const seller = sellerSnap.data() || {};
        const sellerStatus = String(seller.status || "active").toLowerCase();
        if (sellerStatus === "blocked") {
          return res.status(400).json({
            error: "Seller is blocked; approve seller account before deal approval",
          });
        }
      }
    }

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

    await pushNotification({
      userId: sellerId,
      type: "deal_approved",
      message: { key: "dealApproved", vars: { title: deal.title || "" } },
      meta: { dealId },
    });

    // Fan-out to every buyer shouldn't hold the admin's response hostage -
    // at thousands of buyers this can take a while, and the approval itself
    // already succeeded above.
    notifyBuyersOfNewDeal(deal, dealId).catch((error) => {
      console.error("Failed to notify buyers of new deal:", error);
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
      message: reason
        ? { key: "dealRejectedReason", vars: { reason } }
        : { key: "dealRejected" },
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
    const roleFilter = String(req.query.role || "").toLowerCase();
    const statusFilter = String(req.query.status || "").toLowerCase();
    const searchQuery = String(req.query.q || "").trim().toLowerCase();
    const snap = await db.collection(USERS_COLLECTION).limit(limit).get();
    let list = snap.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        approvalStatus: normalizeUserApprovalStatus(data),
      };
    });
    if (roleFilter) {
      list = list.filter((user) => String(user.role || "").toLowerCase() === roleFilter);
    }
    if (statusFilter) {
      list = list.filter((user) => String(user.status || "").toLowerCase() === statusFilter);
    }
    if (searchQuery) {
      list = list.filter((user) => {
        const haystack = [user.id, user.email, user.displayName, user.role, user.status]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        return haystack.includes(searchQuery);
      });
    }
    list.sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/admin/payments", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 1000) : 300;
    const statusFilter = String(req.query.status || "").toLowerCase();
    const buyerFilter = String(req.query.buyerId || "").trim();
    const sellerFilter = String(req.query.sellerId || "").trim();
    const dealFilter = String(req.query.dealId || "").trim();

    const snap = await db.collection(PAYMENTS_COLLECTION).limit(limit).get();
    let list = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    if (statusFilter) {
      list = list.filter(
        (entry) => String(entry.status || "").toLowerCase() === statusFilter,
      );
    }
    if (buyerFilter) {
      list = list.filter((entry) => String(entry.buyerId || "") === buyerFilter);
    }
    if (sellerFilter) {
      list = list.filter((entry) => String(entry.sellerId || "") === sellerFilter);
    }
    if (dealFilter) {
      list = list.filter((entry) => String(entry.dealId || "") === dealFilter);
    }
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/admin/analytics", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const [dealsSnap, usersSnap, paymentsSnap] = await Promise.all([
      db.collection(DEALS_COLLECTION).limit(2000).get(),
      db.collection(USERS_COLLECTION).limit(2000).get(),
      db.collection(PAYMENTS_COLLECTION).limit(2000).get(),
    ]);

    const nowMs = Date.now();
    const deals = dealsSnap.docs.map((doc) => sanitizeDealForResponse(doc));
    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
    const payments = paymentsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));

    const dealStats = deals.reduce(
      (acc, deal) => {
        const approvalStatus = String(deal.approvalStatus || "").toLowerCase();
        const lifecycle = String(deal.lifecycleStatus || deal.status || "").toLowerCase();
        const joined = asNumber(deal.joinedUsers ?? deal.currentJoins, 0);
        const views = asNumber(deal.viewsCount ?? deal.views, 0);

        acc.total += 1;
        acc.joinedUsers += joined;
        acc.views += views;

        if (approvalStatus === "pending") acc.pending += 1;
        if (approvalStatus === "approved") acc.approved += 1;
        if (approvalStatus === "rejected") acc.rejected += 1;
        if (lifecycle === "active" && !isExpiredDeal(deal, nowMs)) acc.active += 1;
        if (isExpiredDeal(deal, nowMs)) acc.expired += 1;

        return acc;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        active: 0,
        expired: 0,
        joinedUsers: 0,
        views: 0,
      },
    );

    const userStats = users.reduce(
      (acc, user) => {
        const role = String(user.role || "").toLowerCase();
        const status = String(user.status || "active").toLowerCase();
        acc.total += 1;
        if (role === "seller") acc.sellers += 1;
        else if (role === "buyer") acc.buyers += 1;
        else if (role === "admin") acc.admins += 1;
        if (status === "blocked") acc.blocked += 1;
        else acc.active += 1;
        return acc;
      },
      { total: 0, sellers: 0, buyers: 0, admins: 0, active: 0, blocked: 0 },
    );

    const paymentStats = payments.reduce(
      (acc, payment) => {
        const status = String(payment.status || "").toLowerCase();
        const amount = asNumber(payment.amount, 0);
        acc.total += 1;
        acc.volume += amount;
        if (status === "captured") {
          acc.captured += 1;
          acc.capturedVolume += amount;
        } else if (status === "refunded") {
          acc.refunded += 1;
          acc.refundedVolume += amount;
        } else if (status === "failed") {
          acc.failed += 1;
        } else if (status === "authorized") {
          acc.authorized += 1;
        } else if (status === "created") {
          acc.created += 1;
        }
        return acc;
      },
      {
        total: 0,
        created: 0,
        authorized: 0,
        captured: 0,
        refunded: 0,
        failed: 0,
        volume: 0,
        capturedVolume: 0,
        refundedVolume: 0,
      },
    );

    const conversionRate =
      dealStats.views > 0
        ? Number(((dealStats.joinedUsers / dealStats.views) * 100).toFixed(2))
        : 0;

    return res.json({
      deals: {
        ...dealStats,
        conversionRate,
      },
      users: userStats,
      payments: paymentStats,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/admin/users/pending", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;
    const roleFilter = String(req.query.role || "").toLowerCase();
    const list = await findPendingUsers({ roleFilter });
    return res.json(list.slice(0, limit));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/admin/users/:uid/approve", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { uid } = req.params;
    await approveUserInternal(uid, req.user.uid);
    return res.json({ ok: true });
  } catch (error) {
    if (error?.statusCode === 404) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/admin/users/:uid/reject", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { uid } = req.params;
    await rejectUserInternal(uid, req.user.uid, req.body?.reason);
    return res.json({ ok: true });
  } catch (error) {
    if (error?.statusCode === 404) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/admin/sellers/pending", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;
    const list = await findPendingUsers({ roleFilter: "seller" });
    return res.json(list.slice(0, limit));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/admin/sellers/:uid/approve", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { uid } = req.params;
    await approveUserInternal(uid, req.user.uid);
    return res.json({ ok: true });
  } catch (error) {
    if (error?.statusCode === 404) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/admin/sellers/:uid/reject", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { uid } = req.params;
    await rejectUserInternal(uid, req.user.uid, req.body?.reason);
    return res.json({ ok: true });
  } catch (error) {
    if (error?.statusCode === 404) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/api/admin/users/:uid", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = {};
    const allowed = [
      "role",
      "status",
      "approvalStatus",
      "displayName",
      "theme",
      "phone",
    ];
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
    const hydratedList = await attachSellerNamesToDeals(list);
    return res.json(hydratedList);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
