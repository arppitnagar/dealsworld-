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
  DEFAULT_DEAL_LIMIT,
  MAX_DEAL_LIMIT,
  DEFAULT_ADDRESS_COUNTRY,
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
  };
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

async function ensureUserProfile(uid, seed = {}) {
  const ref = db.collection(USERS_COLLECTION).doc(uid);
  const snap = await ref.get();
  if (snap.exists) {
    return { id: snap.id, ...(snap.data() || {}) };
  }
  const role = String(seed?.role || "buyer").toLowerCase();
  const defaultApprovalStatus = "approved";
  const payload = {
    role,
    status: "active",
    approvalStatus: defaultApprovalStatus,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...seed,
  };
  await ref.set(payload, { merge: true });
  return { id: uid, ...payload };
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

function requireRole(...roles) {
  const allowed = new Set(roles.map((value) => String(value).toLowerCase()));
  return async (req, res, next) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const profile = await ensureUserProfile(req.user.uid, {
        email: req.user.email || "",
      });
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

function extractDealPayload(input = {}, sellerId = null) {
  const expiresAt = parseDate(input.expiresAt);
  const expiryTime = parseDate(input.expiryTime);
  const expiresAtDate =
    expiresAt || expiryTime || new Date(Date.now() + 48 * 60 * 60 * 1000);

  const minGroupSize = asNumber(
    input.minGroupSize ?? input.minThreshold,
    1,
  );
  const currentJoins = asNumber(input.currentJoins ?? input.joinedUsers, 0);

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
    minGroupSize: Math.max(1, minGroupSize),
    minThreshold: Math.max(1, minGroupSize),
    joinedUsers: Math.max(0, currentJoins),
    currentJoins: Math.max(0, currentJoins),
    location: String(input.location || ""),
    image: input.image ?? null,
    imageUrl: input.imageUrl ?? input.image ?? null,
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
    "minGroupSize",
    "minThreshold",
    "location",
    "image",
    "imageUrl",
  ];

  updatableFields.forEach((field) => {
    if (input[field] !== undefined) {
      updates[field] = input[field];
    }
  });

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
  if (updates.deliveryCharge !== undefined) {
    updates.deliveryCharge = asNumber(updates.deliveryCharge, 0);
  }
  if (updates.originalPrice !== undefined) {
    updates.originalPrice = asNumber(updates.originalPrice, 0);
  }
  if (updates.discountPrice !== undefined) {
    updates.discountPrice = asNumber(updates.discountPrice, 0);
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
  DEFAULT_DEAL_LIMIT,
  MAX_DEAL_LIMIT,
  DEFAULT_ADDRESS_COUNTRY,
  nowIso,
  asNumber,
  asBoolean,
  parseDate,
  toMillis,
  getExpiryMs,
  getCreatedMs,
  getSellerId,
  normalizeApprovalStatus,
  normalizeLifecycleStatus,
  isExpiredDeal,
  sanitizeDealForResponse,
  getUserDisplayName,
  attachSellerNamesToDeals,
  ensureUserProfile,
  normalizeUserApprovalStatus,
  normalizeAuthHeader,
  requireAuth,
  requireRole,
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
  extractDealPayload,
  applyDealUpdate,
};

