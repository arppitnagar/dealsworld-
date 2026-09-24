const crypto = require("crypto");
const { admin, db, FieldValue } = require("./firebase");
const {
  DEALS_COLLECTION,
  USERS_COLLECTION,
  DEAL_JOINS_COLLECTION,
  PAYMENTS_COLLECTION,
  PAYMENT_EVENTS_COLLECTION,
  REVIEWS_COLLECTION,
  NOTIFICATIONS_COLLECTION,
  ADDRESS_COLLECTION,
  COUNTERS_COLLECTION,
  APP_CONFIG_COLLECTION,
  DEFAULT_DEAL_LIMIT,
  MAX_DEAL_LIMIT,
  DEFAULT_ADDRESS_COUNTRY,
  VERSION_GATE_DOC_ID,
  VERSION_GATE_APPS,
  DEFAULT_MIN_APP_VERSIONS,
} = require("./constants");

function nowIso() {
  return new Date().toISOString();
}

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function asBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      const ms = numeric < 1e12 ? numeric * 1000 : numeric;
      const parsed = new Date(ms);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    const nanos = value.nanoseconds ?? value._nanoseconds ?? 0;
    if (typeof seconds === "number") {
      const parsed = new Date(seconds * 1000 + Math.floor(nanos / 1e6));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

function toMillis(value) {
  const parsed = parseDate(value);
  return parsed ? parsed.getTime() : null;
}

function getExpiryMs(deal) {
  const expiresAtMs = toMillis(deal?.expiresAt);
  const expiryTimeMs = toMillis(deal?.expiryTime);
  return expiresAtMs || expiryTimeMs || null;
}

function getCreatedMs(deal) {
  return toMillis(deal?.createdAt) || 0;
}

function getSellerId(deal) {
  return deal?.sellerId || null;
}

function normalizeApprovalStatus(deal) {
  const explicit = String(deal?.approvalStatus || "").toLowerCase();
  if (explicit) return explicit;
  if (asBoolean(deal?.approved, false)) return "approved";
  const status = String(deal?.status || "").toLowerCase();
  if (status === "active") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

function normalizeLifecycleStatus(deal) {
  const explicit = String(deal?.lifecycleStatus || "").toLowerCase();
  if (explicit) return explicit;
  const status = String(deal?.status || "").toLowerCase();
  if (status) return status;
  return "pending";
}

function isExpiredDeal(deal, nowMs = Date.now()) {
  const expiryMs = getExpiryMs(deal);
  if (typeof expiryMs !== "number") return true;
  return expiryMs <= nowMs;
}

function sanitizeDealForResponse(doc) {
  const data = doc.data ? doc.data() : doc;
  const id = doc.id || data.id;
  const sellerName =
    String(
      data?.sellerName ||
        data?.sellerDisplayName ||
        data?.vendorName ||
        "",
    ).trim() || null;
  return {
    id,
    ...data,
    sellerId: getSellerId(data),
    sellerName,
    approvalStatus: normalizeApprovalStatus(data),
    lifecycleStatus: normalizeLifecycleStatus(data),
    avgJoinTimeSeconds: deriveAvgJoinTimeSeconds(data),
  };
}

// join/leave (routes/deals.js) write joinTimeSecondsSum/joinEventsCount via
// FieldValue.increment() instead of a computed avgJoinTimeSeconds literal -
// increments never conflict with each other under concurrent joins, unlike
// a read-modify-write average, which was adding unnecessary contention to
// the join transaction. Derive the average at read time instead; deals
// written before this change have no joinTimeSecondsSum, so fall back to
// their legacy stored avgJoinTimeSeconds.
function deriveAvgJoinTimeSeconds(data) {
  const joinEventsCount = asNumber(data?.joinEventsCount, 0);
  const joinTimeSecondsSum = data?.joinTimeSecondsSum;
  if (typeof joinTimeSecondsSum === "number" && joinEventsCount > 0) {
    return Math.round(joinTimeSecondsSum / joinEventsCount);
  }
  return data?.avgJoinTimeSeconds ?? null;
}

// Fields a list/card view actually renders (see DealCard.js and the
// per-screen field mapping in Home/Deals/Search screens, buyer + seller) or
// that sort/filter (dealSortFilter.js) needs. Detail-only fields
// (description, pricingTiers, gstPercent, deliveryCharge, dispatchStatus,
// dealCode, storeAddress/pickupAddress, the approval sub-object, etc.) are
// deliberately left out - full documents are still available via the
// single-deal detail endpoints.
//
// NOT wired into any route yet: today's client-side search
// (dealSearch.js's buildSearchHaystack) walks every field of whatever list
// response it's given, so switching GET /api/deals over to this before
// search moves server-side would silently narrow what a buyer/seller can
// search for, with no error. Wire this in once search no longer depends on
// the full document shape.
const LIST_RESPONSE_FIELDS = [
  "id", "title", "category", "images", "imageUrl", "image",
  "thumbUrl", "thumbImages",
  "currentJoins", "joinedUsers", "minGroupSize", "minThreshold", "maxGroupSize",
  "viewsCount", "favoritesCount", "ratingAvg", "ratingCount",
  "originalPrice", "discountPrice", "location", "city", "cityLower", "deliveryMode",
  "expiresAt", "expiryTime", "status", "lifecycleStatus", "thresholdReachedAt",
  "approvalStatus", "approved", "sellerId", "sellerName", "dealCode",
  "createdAt", "updatedAt",
];

function sanitizeDealForListResponse(doc) {
  const full = sanitizeDealForResponse(doc);
  const trimmed = {};
  LIST_RESPONSE_FIELDS.forEach((key) => {
    if (key in full) trimmed[key] = full[key];
  });
  return trimmed;
}

function getUserDisplayName(profile = {}, fallback = "") {
  const candidates = [
    profile.displayName,
    profile.fullName,
    profile.name,
    profile.businessName,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) return text;
  }
  const email = String(profile.email || "").trim();
  if (email.includes("@")) {
    return email.split("@")[0];
  }
  return String(fallback || "").trim();
}

async function attachSellerNamesToDeals(deals = []) {
  if (!Array.isArray(deals) || deals.length === 0) return deals;

  const sellerIds = [
    ...new Set(
      deals
        .map((deal) => String(getSellerId(deal) || "").trim())
        .filter(Boolean),
    ),
  ];

  if (sellerIds.length === 0) {
    return deals.map((deal) => ({
      ...deal,
      sellerName:
        String(
          deal?.sellerName ||
            deal?.sellerDisplayName ||
            deal?.vendorName ||
            "",
        ).trim() || null,
    }));
  }

  const refs = sellerIds.map((id) => db.collection(USERS_COLLECTION).doc(id));
  const snaps = await Promise.all(refs.map((ref) => ref.get()));
  const namesById = new Map();
  const unresolvedSellerIds = [];

  snaps.forEach((snap, index) => {
    const sellerId = sellerIds[index];
    if (!sellerId) return;
    if (!snap.exists) {
      unresolvedSellerIds.push(sellerId);
      return;
    }
    const profile = snap.data() || {};
    namesById.set(sellerId, getUserDisplayName(profile, sellerId));
  });

  if (unresolvedSellerIds.length > 0) {
    const aliasFields = [
      "sellerId",
      "vendorId",
      "vendorid",
      "legacySellerId",
      "sellerCode",
      "code",
    ];

    await Promise.all(
      unresolvedSellerIds.map(async (sellerAlias) => {
        for (const field of aliasFields) {
          const snap = await db
            .collection(USERS_COLLECTION)
            .where(field, "==", sellerAlias)
            .limit(1)
            .get();
          if (!snap.empty) {
            const profile = snap.docs[0].data() || {};
            namesById.set(
              sellerAlias,
              getUserDisplayName(profile, sellerAlias),
            );
            return;
          }
        }
        namesById.set(sellerAlias, sellerAlias);
      }),
    );
  }

  return deals.map((deal) => {
    const sellerId = String(getSellerId(deal) || "").trim();
    const existingName = String(
      deal?.sellerName || deal?.sellerDisplayName || deal?.vendorName || "",
    ).trim();
    const resolvedName = existingName || namesById.get(sellerId) || sellerId || null;

    return {
      ...deal,
      sellerId: sellerId || null,
      sellerName: resolvedName,
    };
  });
}

// Deals are created by a direct client-side Firestore write
// (apps/seller/src/screens/CreateDealScreen.js addDoc), not through this
// backend's POST /api/deals - so dealCode (a short sequential DEAL-0001
// code, unlike the deal's own random Firestore doc ID) can't be assigned at
// creation time. Instead it's assigned lazily, the first time the deal is
// read through this backend, the same self-healing pattern used for a
// buyer's missing role/buyerCode in ensureUserProfile.
async function maybeAssignDealCode(dealId, deal) {
  if (deal?.dealCode) return deal.dealCode;
  try {
    const dealRef = db.collection(DEALS_COLLECTION).doc(dealId);
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(dealRef);
      if (!snap.exists) return null;
      const data = snap.data() || {};
      if (data.dealCode) return data.dealCode;

      const counterRef = db.collection(COUNTERS_COLLECTION).doc("deals");
      const counterSnap = await tx.get(counterRef);
      const next = asNumber(counterSnap.exists ? counterSnap.data()?.value : 0, 0) + 1;
      const dealCode = formatSequenceCode("DEAL", next);

      tx.set(counterRef, { value: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(dealRef, { dealCode, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return dealCode;
    });
  } catch (error) {
    console.warn("maybeAssignDealCode failed:", dealId, error.message || error);
    return null;
  }
}

// Batch version for list responses - only touches deals actually missing a
// dealCode (i.e. every deal exactly once, ever).
async function ensureDealCodes(deals = []) {
  if (!Array.isArray(deals) || deals.length === 0) return deals;
  return Promise.all(
    deals.map(async (deal) => {
      if (deal.dealCode) return deal;
      const dealCode = await maybeAssignDealCode(deal.id, deal);
      return dealCode ? { ...deal, dealCode } : deal;
    }),
  );
}

// Atomically increments a named counter doc (counters/{name}.value) and
// returns the new integer - the building block for every short sequential
// ID in the app (DEAL-0001, BUYER-0001, ...). A transaction is required
// since multiple deals/signups can happen concurrently.
async function getNextSequence(name) {
  const ref = db.collection(COUNTERS_COLLECTION).doc(name);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = asNumber(snap.exists ? snap.data()?.value : 0, 0);
    const next = current + 1;
    tx.set(ref, { value: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });
}

function formatSequenceCode(prefix, value, pad = 4) {
  return `${prefix}-${String(value).padStart(pad, "0")}`;
}

async function ensureUserProfile(uid, seed = {}) {
  const ref = db.collection(USERS_COLLECTION).doc(uid);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() || {} : null;

  // A doc can exist with no `role` - e.g. a client writing an unrelated
  // field (push token, favorites) before its own profile-seeding logic
  // runs, racing ahead of it. Backfill the missing defaults instead of
  // leaving the account permanently stuck failing every requireRole check.
  const needsRole = !existing || !existing.role;
  const role = String((existing && existing.role) || seed?.role || "buyer").toLowerCase();
  const needsBuyerCode = role === "buyer" && !existing?.buyerCode;

  if (!needsRole && !needsBuyerCode) {
    return { id: snap.id, ...existing };
  }

  const payload = {};
  if (needsRole) {
    payload.role = role;
    payload.status = existing?.status || "active";
    payload.approvalStatus = existing?.approvalStatus || "approved";
    payload.createdAt = existing?.createdAt || FieldValue.serverTimestamp();
  }
  if (needsBuyerCode) {
    payload.buyerCode = formatSequenceCode("BUYER", await getNextSequence("buyers"));
  }
  payload.updatedAt = FieldValue.serverTimestamp();

  const finalPayload = { ...payload, ...seed };
  await ref.set(finalPayload, { merge: true });
  return { id: uid, ...existing, ...finalPayload };
}

function normalizeUserApprovalStatus(profile = {}) {
  const explicit = String(profile?.approvalStatus || "").toLowerCase();
  if (explicit) return explicit;
  const role = String(profile?.role || "").toLowerCase();
  // Backward compatibility for legacy profiles.
  if (role === "seller") return "pending";
  return "approved";
}

function normalizeAuthHeader(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function requireAuth(req, res, next) {
  try {
    const token = normalizeAuthHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Missing bearer token" });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || "",
      decoded,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

// requireRole runs on every role-gated request, and ensureUserProfile() is a
// Firestore read (occasionally a write, for backfill). A short TTL cache
// cuts that to roughly one read per user per window instead of one per
// request, while keeping the staleness window small enough that a
// newly-approved or newly-blocked account still takes effect within a few
// seconds rather than needing every mutation site to explicitly invalidate it.
const ROLE_PROFILE_CACHE_TTL_MS = 10_000;
const roleProfileCache = new Map();

function requireRole(...roles) {
  const allowed = new Set(roles.map((value) => String(value).toLowerCase()));
  return async (req, res, next) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const uid = req.user.uid;
      const cached = roleProfileCache.get(uid);
      const nowMs = Date.now();
      let profile;
      if (cached && cached.expiresAt > nowMs) {
        profile = cached.profile;
      } else {
        profile = await ensureUserProfile(uid, {
          email: req.user.email || "",
        });
        roleProfileCache.set(uid, { profile, expiresAt: nowMs + ROLE_PROFILE_CACHE_TTL_MS });
      }
      const role = String(profile.role || "").toLowerCase();
      if (!allowed.has(role)) {
        return res.status(403).json({ error: "Insufficient role" });
      }
      const status = String(profile.status || "active").toLowerCase();
      if (status === "blocked") {
        return res.status(403).json({ error: "Account is blocked" });
      }
      req.userProfile = profile;
      return next();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
}

// Call after directly mutating a user's role/status/approvalStatus (e.g.
// admin approve/reject/block) so the change is enforced immediately instead
// of waiting out ROLE_PROFILE_CACHE_TTL_MS.
function invalidateUserProfileCache(uid) {
  roleProfileCache.delete(uid);
}

function optionalAuth(req, _res, next) {
  const token = normalizeAuthHeader(req.headers.authorization);
  if (!token) return next();
  admin
    .auth()
    .verifyIdToken(token)
    .then((decoded) => {
      req.user = {
        uid: decoded.uid,
        email: decoded.email || "",
        decoded,
      };
      next();
    })
    .catch(() => {
      next();
    });
}

function getBuyerId(req) {
  if (req.user?.uid) return req.user.uid;
  if (req.body?.buyerId) return String(req.body.buyerId);
  return "anonymous";
}

function makeJoinDocId(dealId, buyerId) {
  return `${dealId}_${buyerId}`;
}

function validateAddress(address) {
  if (!address || typeof address !== "object") return false;
  const required = ["line1", "city", "state", "pincode"];
  return required.every((field) => String(address[field] || "").trim().length > 0);
}

function normalizeAddressInput(input = {}) {
  return {
    label: String(input.label || "Address"),
    name: String(input.name || ""),
    phone: String(input.phone || ""),
    line1: String(input.line1 || ""),
    line2: String(input.line2 || ""),
    city: String(input.city || ""),
    state: String(input.state || ""),
    pincode: String(input.pincode || ""),
    country: String(input.country || DEFAULT_ADDRESS_COUNTRY),
    isDefault: asBoolean(input.isDefault, false),
    isDeleted: asBoolean(input.isDeleted, false),
  };
}

function makePaymentId() {
  return `pay_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function makeProviderOrderId() {
  return `order_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

function isDeliveryMode(mode) {
  const value = String(mode || "").trim().toLowerCase();
  if (!value) return false;
  return !value.includes("pick");
}

function isPickupMode(mode) {
  const value = String(mode || "").trim().toLowerCase();
  if (!value) return false;
  return value.includes("pick");
}

function hasStoreAddress(deal = {}) {
  const storeAddress = String(deal.storeAddress || "").trim();
  const pickupAddress = String(deal.pickupAddress || "").trim();
  return Boolean(storeAddress || pickupAddress);
}

function validateDealPublishability(deal = {}) {
  if (!isPickupMode(deal.deliveryMode)) return null;
  if (hasStoreAddress(deal)) return null;
  return "Pickup deals require a store address before publish";
}

const MAX_OTP_ATTEMPTS = 5;

function generateSixDigitOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function generatePickupToken() {
  return crypto.randomBytes(20).toString("hex");
}

// Only the deal's own seller (or an admin) may manage its delivery/lifecycle
// actions (dispatch, mark-delivered, complete, expire-early). Shared by
// routes/delivery.js and routes/deals.js.
function assertSellerOwnsDeal(deal, req) {
  const role = String(req.userProfile?.role || "").toLowerCase();
  const sellerId = getSellerId(deal);
  if (role !== "admin" && sellerId && sellerId !== req.user.uid) {
    const error = new Error("Only the seller can manage this deal");
    error.status = 403;
    throw error;
  }
}

// Shared by the OTP-confirm and seller-override delivery routes
// (routes/delivery.js). Must be called inside an active transaction with
// both dealRef/joinRef already read via tx.get() (deal and joinData are the
// plain data, not the snapshots). Increments the deal's delivered count and,
// once every joined buyer has confirmed, stamps the deal as fully delivered.
// Also releases a held payment to the seller now that delivery is confirmed
// (see the "pay" flag flow in routes/deals.js) - this is the one place both
// confirmation paths funnel through, so it's the only place that needs to
// know about the payment-hold release.
function applyDeliveryConfirmation(tx, { dealRef, deal, joinRef, joinData, via }) {
  const currentJoins = asNumber(deal.currentJoins ?? deal.joinedUsers, 0);
  const nextDeliveredCount = asNumber(deal.deliveredCount, 0) + 1;
  const rollupComplete = currentJoins > 0 && nextDeliveredCount >= currentJoins;

  const dealUpdates = {
    deliveredCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (rollupComplete) {
    dealUpdates.dispatchStatus = "delivered";
    dealUpdates.allDeliveredAt = FieldValue.serverTimestamp();
  }

  const paymentReleaseUpdates =
    joinData?.paymentStatus === "paid_blocked"
      ? {
          paymentStatus: "released_to_seller",
          paymentReleasedAt: FieldValue.serverTimestamp(),
          paymentReleaseReason: "delivered",
          // settledAmount is set by /complete's tiered-pricing settlement
          // step (falls back to whatever was actually paid for a deal that
          // was never tiered, or completed before that step existed).
          releasedAmount: asNumber(joinData.settledAmount ?? joinData.paidAmount ?? joinData.amount, 0),
        }
      : {};

  tx.set(
    joinRef,
    {
      deliveryStatus: "delivered",
      deliveredAt: FieldValue.serverTimestamp(),
      deliveryConfirmedVia: via,
      updatedAt: FieldValue.serverTimestamp(),
      ...paymentReleaseUpdates,
    },
    { merge: true },
  );
  tx.set(dealRef, dealUpdates, { merge: true });

  return { rollupComplete };
}

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

// Sends real OS push notifications via Expo's push service. Tokens come
// from Notifications.getExpoPushTokenAsync() on each client, saved to
// users/{uid}.expoPushToken (apps/*/src/hooks/usePushToken.js). Expo's
// endpoint accepts up to 100 messages per request and needs no API secret
// for basic sending.
async function sendExpoPushNotifications(messages) {
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }
  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) {
        console.warn("Expo push request failed:", response.status, await response.text());
      }
    } catch (error) {
      console.warn("Expo push request errored:", error.message || error);
    }
  }
}

// Writes the in-app notification doc (apps/*/src/hooks/useNotifications.js
// reads users/{uid}/notifications) and, if the user has a registered Expo
// push token, also sends a real OS push notification for it.
async function pushNotification({ userId, type, title, body, meta = {} }) {
  if (!userId) return;
  await db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(NOTIFICATIONS_COLLECTION)
    .add({
      type,
      title,
      body,
      ...meta,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

  const userSnap = await db.collection(USERS_COLLECTION).doc(userId).get();
  const expoPushToken = userSnap.exists ? userSnap.data()?.expoPushToken : null;
  if (!expoPushToken) return;

  await sendExpoPushNotifications([
    {
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data: { type, ...meta },
    },
  ]);
}

// A buyer with no notificationPrefs (or enabled left unset) gets every new
// deal - filtering is opt-in, so nobody silently stops hearing about deals
// just because this feature shipped.
function dealMatchesPrefs(deal, prefs) {
  if (!prefs) return true;
  if (prefs.enabled === false) return false;

  const categories = Array.isArray(prefs.categories) ? prefs.categories : [];
  if (categories.length && !categories.includes(deal.category)) return false;

  const cities = Array.isArray(prefs.cities) ? prefs.cities : [];
  if (cities.length) {
    const location = String(deal.location || "").toLowerCase();
    const matchesCity = cities.some((city) =>
      location.includes(String(city || "").toLowerCase().trim()),
    );
    if (!matchesCity) return false;
  }

  const price = asNumber(deal.discountPrice, 0);
  if (prefs.minPrice != null && price < asNumber(prefs.minPrice, 0)) return false;
  if (prefs.maxPrice != null && price > asNumber(prefs.maxPrice, Infinity)) return false;

  return true;
}

// Fans out a "new deal published" notification to every buyer whose
// notificationPrefs match this deal. Called once at admin-approval time
// (routes/admin.js), which is when a deal actually becomes buyer-visible.
async function notifyBuyersOfNewDeal(deal, dealId) {
  const buyersSnap = await db
    .collection(USERS_COLLECTION)
    .where("role", "==", "buyer")
    .get();

  const title = "New deal published";
  const body = deal.title || "Check out a new deal";

  await Promise.all(
    buyersSnap.docs.map((buyerDoc) => {
      const prefs = buyerDoc.data()?.notificationPrefs;
      if (!dealMatchesPrefs(deal, prefs)) return null;
      return pushNotification({
        userId: buyerDoc.id,
        type: "deal",
        title,
        body,
        meta: { dealId },
      });
    }),
  );
}

// Normalizes a deal's image gallery to an array of URL strings. Falls back
// to a single legacy `image`/`imageUrl` value when no `images` array was
// provided, so deals created before multi-image support still show one.
function normalizeImages(images, fallbackSingle = null) {
  if (Array.isArray(images)) {
    const cleaned = images.filter((url) => typeof url === "string" && url.trim());
    if (cleaned.length) return cleaned;
  }
  return fallbackSingle ? [fallbackSingle] : [];
}

// A deal opts into dynamic group pricing via pricingTiers: an ordered,
// contiguous list of { minBuyers, maxBuyers, price }, where only the last
// tier may leave maxBuyers null (open-ended). Real enforcement of the shape
// (contiguity, non-increasing prices, first tier == discountPrice) lives in
// firestore.rules isValidPricingTiers, since deals are created/edited via a
// direct client write - this just normalizes types for whatever's stored.
function normalizePricingTiers(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  return tiers
    .map((tier) => ({
      minBuyers: Math.max(1, Math.round(asNumber(tier?.minBuyers, 1))),
      maxBuyers:
        tier?.maxBuyers === null || tier?.maxBuyers === undefined || tier?.maxBuyers === ""
          ? null
          : Math.max(1, Math.round(asNumber(tier.maxBuyers, 1))),
      price: Math.max(0, asNumber(tier?.price, 0)),
    }))
    .sort((a, b) => a.minBuyers - b.minBuyers);
}

// The live price for a deal at a given headcount. Mirrors
// packages/shared/utils/priceBreakup.js resolveTierPrice - the backend can't
// import that RN/Expo package directly (different runtime), so this is
// intentionally duplicated; keep both in sync.
function resolveTierPrice(deal, joinCount) {
  const tiers = Array.isArray(deal?.pricingTiers) ? deal.pricingTiers : null;
  const basePrice = Math.max(0, asNumber(deal?.discountPrice, 0));
  if (!tiers || !tiers.length) return basePrice;
  const count = Math.max(0, asNumber(joinCount, 0));
  // A plain 0 sits below every tier's minBuyers (tier 1 always starts at
  // 1), so it must fall back to tier 1 - not the .find()'s -1 falling
  // through to the LAST (cheapest) tier, which would hand out the best
  // price to a deal nobody has joined yet.
  const matchedIndex = tiers.findIndex((t) => {
    const min = asNumber(t?.minBuyers, 1);
    const max = t?.maxBuyers === null || t?.maxBuyers === undefined ? null : asNumber(t.maxBuyers, min);
    return count >= min && (max === null || count <= max);
  });
  const tier = tiers[matchedIndex !== -1 ? matchedIndex : 0];
  const price = asNumber(tier?.price, 0);
  return price > 0 ? price : basePrice;
}

function extractDealPayload(input = {}, sellerId = null) {
  const expiresAt = parseDate(input.expiresAt);
  const expiryTime = parseDate(input.expiryTime);
  const expiresAtDate =
    expiresAt || expiryTime || new Date(Date.now() + 48 * 60 * 60 * 1000);

  const minGroupSize = asNumber(
    input.minGroupSize ?? input.minThreshold,
    1,
  );
  const maxGroupSizeRaw = input.maxGroupSize;
  const maxGroupSize =
    maxGroupSizeRaw === null || maxGroupSizeRaw === undefined || maxGroupSizeRaw === ""
      ? null
      : Math.max(Math.max(1, minGroupSize), asNumber(maxGroupSizeRaw, 0));
  const currentJoins = asNumber(input.currentJoins ?? input.joinedUsers, 0);
  const images = normalizeImages(input.images, input.imageUrl ?? input.image);

  return {
    title: String(input.title || ""),
    description: String(input.description || ""),
    category: String(input.category || ""),
    categoryOther: String(input.categoryOther || ""),
    deliveryMode: String(input.deliveryMode || ""),
    deliveryCharge: asNumber(input.deliveryCharge, 0),
    storeAddress: String(input.storeAddress || "").trim(),
    pickupAddress: String(input.pickupAddress || "").trim(),
    originalPrice: asNumber(input.originalPrice, 0),
    discountPrice: asNumber(input.discountPrice ?? input.price, 0),
    gstPercent: asNumber(input.gstPercent, 0),
    minGroupSize: Math.max(1, minGroupSize),
    minThreshold: Math.max(1, minGroupSize),
    maxGroupSize,
    pricingTiers: normalizePricingTiers(input.pricingTiers),
    joinedUsers: Math.max(0, currentJoins),
    currentJoins: Math.max(0, currentJoins),
    location: String(input.location || ""),
    city: String(input.city || "").trim(),
    cityLower: String(input.city || "").trim().toLowerCase(),
    images,
    image: input.image ?? images[0] ?? null,
    imageUrl: input.imageUrl ?? input.image ?? images[0] ?? null,
    sellerId: sellerId || input.sellerId || "",
    viewsCount: asNumber(input.viewsCount, 0),
    favoritesCount: asNumber(input.favoritesCount ?? input.favouritesCount, 0),
    leftCount: asNumber(input.leftCount, 0),
    joinEventsCount: asNumber(input.joinEventsCount, 0),
    avgJoinTimeSeconds: input.avgJoinTimeSeconds ?? null,
    thresholdReachedAt: input.thresholdReachedAt || null,
    lastViewedAt: input.lastViewedAt || null,
    ratingCount: asNumber(input.ratingCount, 0),
    ratingTotal: asNumber(input.ratingTotal, 0),
    ratingAvg: asNumber(input.ratingAvg, 0),
    approvalStatus: String(input.approvalStatus || "pending").toLowerCase(),
    lifecycleStatus: String(input.lifecycleStatus || "pending").toLowerCase(),
    status: String(input.status || "pending").toLowerCase(),
    approved: asBoolean(input.approved, false),
    expiresAt: expiresAtDate,
    expiryTime: expiresAtDate,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function applyDealUpdate(input = {}) {
  const updates = {};
  const updatableFields = [
    "title",
    "description",
    "category",
    "categoryOther",
    "deliveryMode",
    "deliveryCharge",
    "storeAddress",
    "pickupAddress",
    "originalPrice",
    "discountPrice",
    "gstPercent",
    "minGroupSize",
    "minThreshold",
    "maxGroupSize",
    "pricingTiers",
    "location",
    "city",
    "image",
    "imageUrl",
    "images",
  ];

  updatableFields.forEach((field) => {
    if (input[field] !== undefined) {
      updates[field] = input[field];
    }
  });

  if (input.city !== undefined) {
    updates.cityLower = String(input.city || "").trim().toLowerCase();
  }

  if (input.images !== undefined) {
    const images = normalizeImages(input.images);
    updates.images = images;
    if (input.image === undefined) updates.image = images[0] ?? null;
    if (input.imageUrl === undefined) updates.imageUrl = images[0] ?? null;
  }

  if (input.expiresAt !== undefined || input.expiryTime !== undefined) {
    const expiryDate = parseDate(input.expiresAt || input.expiryTime);
    if (expiryDate) {
      updates.expiresAt = expiryDate;
      updates.expiryTime = expiryDate;
    }
  }

  if (updates.minGroupSize !== undefined) {
    const min = Math.max(1, asNumber(updates.minGroupSize, 1));
    updates.minGroupSize = min;
    updates.minThreshold = min;
  }
  if (updates.maxGroupSize !== undefined) {
    const rawMax = updates.maxGroupSize;
    const minFloor = Math.max(1, asNumber(updates.minGroupSize, 1));
    updates.maxGroupSize =
      rawMax === null || rawMax === "" ? null : Math.max(minFloor, asNumber(rawMax, minFloor));
  }
  if (updates.pricingTiers !== undefined) {
    updates.pricingTiers = normalizePricingTiers(updates.pricingTiers);
  }
  if (updates.deliveryCharge !== undefined) {
    updates.deliveryCharge = asNumber(updates.deliveryCharge, 0);
  }
  if (updates.originalPrice !== undefined) {
    updates.originalPrice = asNumber(updates.originalPrice, 0);
  }
  if (updates.discountPrice !== undefined) {
    updates.discountPrice = asNumber(updates.discountPrice, 0);
  }
  if (updates.gstPercent !== undefined) {
    updates.gstPercent = asNumber(updates.gstPercent, 0);
  }
  updates.updatedAt = FieldValue.serverTimestamp();
  return updates;
}

module.exports = {
  admin,
  db,
  FieldValue,
  DEALS_COLLECTION,
  USERS_COLLECTION,
  DEAL_JOINS_COLLECTION,
  PAYMENTS_COLLECTION,
  PAYMENT_EVENTS_COLLECTION,
  REVIEWS_COLLECTION,
  NOTIFICATIONS_COLLECTION,
  ADDRESS_COLLECTION,
  COUNTERS_COLLECTION,
  APP_CONFIG_COLLECTION,
  DEFAULT_DEAL_LIMIT,
  MAX_DEAL_LIMIT,
  DEFAULT_ADDRESS_COUNTRY,
  VERSION_GATE_DOC_ID,
  VERSION_GATE_APPS,
  DEFAULT_MIN_APP_VERSIONS,
  nowIso,
  asNumber,
  asBoolean,
  getNextSequence,
  formatSequenceCode,
  parseDate,
  toMillis,
  getExpiryMs,
  getCreatedMs,
  getSellerId,
  normalizeApprovalStatus,
  normalizeLifecycleStatus,
  isExpiredDeal,
  sanitizeDealForResponse,
  sanitizeDealForListResponse,
  getUserDisplayName,
  attachSellerNamesToDeals,
  maybeAssignDealCode,
  ensureDealCodes,
  ensureUserProfile,
  normalizeUserApprovalStatus,
  normalizeAuthHeader,
  requireAuth,
  requireRole,
  invalidateUserProfileCache,
  optionalAuth,
  getBuyerId,
  makeJoinDocId,
  validateAddress,
  normalizeAddressInput,
  makePaymentId,
  makeProviderOrderId,
  isDeliveryMode,
  isPickupMode,
  hasStoreAddress,
  validateDealPublishability,
  pushNotification,
  notifyBuyersOfNewDeal,
  extractDealPayload,
  applyDealUpdate,
  normalizePricingTiers,
  resolveTierPrice,
  MAX_OTP_ATTEMPTS,
  generateSixDigitOtp,
  generatePickupToken,
  assertSellerOwnsDeal,
  applyDeliveryConfirmation,
};

