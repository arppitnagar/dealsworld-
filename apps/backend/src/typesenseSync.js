// Keeps Typesense's `deals` index in sync with Firestore. A reconciliation
// poller, not inline hooks in the mutation routes - deal creation and most
// edits happen via direct client-side Firestore writes from
// CreateDealScreen.js (addDoc/updateDoc), bypassing this backend entirely,
// so inline sync at backend route handlers would silently miss most content
// edits. Wired into server.js via setInterval, same pattern as
// expirySweep.js (reentrancy guard, bounded work per pass).
const {
  admin,
  db,
  DEALS_COLLECTION,
  APP_CONFIG_COLLECTION,
  toMillis,
  asNumber,
  sanitizeDealForResponse,
  sanitizeDealForListResponse,
} = require("./lib");
const { client, DEALS_INDEX_NAME, ensureDealsCollection } = require("./typesenseClient");

const SYNC_STATE_DOC_ID = "typesenseSync";
const SYNC_BATCH_LIMIT = 500;
const MAX_BATCHES_PER_RUN = 20; // safety cap - drains up to 10k docs per tick

async function getWatermarkMs() {
  const snap = await db.collection(APP_CONFIG_COLLECTION).doc(SYNC_STATE_DOC_ID).get();
  return asNumber(snap.data()?.lastWatermarkMs, 0);
}

async function setWatermarkMs(ms) {
  await db
    .collection(APP_CONFIG_COLLECTION)
    .doc(SYNC_STATE_DOC_ID)
    .set({ lastWatermarkMs: ms }, { merge: true });
}

function toTypesenseDocument(doc) {
  const fullDeal = sanitizeDealForResponse(doc);
  const listDeal = sanitizeDealForListResponse(doc);
  return {
    id: doc.id,
    title: String(listDeal.title || ""),
    description: String(fullDeal.description || ""),
    category: String(listDeal.category || ""),
    location: String(listDeal.location || ""),
    city: String(listDeal.city || ""),
    deliveryMode: String(listDeal.deliveryMode || ""),
    sellerId: String(listDeal.sellerId || ""),
    sellerName: String(listDeal.sellerName || ""),
    dealCode: String(listDeal.dealCode || ""),
    status: String(listDeal.status || ""),
    approvalStatus: String(listDeal.approvalStatus || ""),
    originalPrice: asNumber(listDeal.originalPrice, 0),
    discountPrice: asNumber(listDeal.discountPrice, 0),
    currentJoins: asNumber(listDeal.currentJoins, 0),
    minGroupSize: asNumber(listDeal.minGroupSize, 1),
    expiresAtMs: toMillis(listDeal.expiresAt) || toMillis(listDeal.expiryTime) || 0,
    createdAtMs: toMillis(listDeal.createdAt) || 0,
    // Returned as-is to the client (see routes/search.js) so search results
    // render with the same fields as the browse feed, without a second
    // Firestore round trip per search.
    dealJson: JSON.stringify(listDeal),
  };
}

// Syncs one batch starting after watermarkMs. Returns the new watermark and
// whether the batch was full (more docs may remain beyond it).
async function syncBatch(watermarkMs) {
  const watermarkTimestamp = admin.firestore.Timestamp.fromMillis(watermarkMs);
  const snap = await db
    .collection(DEALS_COLLECTION)
    .where("updatedAt", ">", watermarkTimestamp)
    .orderBy("updatedAt", "asc")
    .limit(SYNC_BATCH_LIMIT)
    .get();

  if (snap.empty) {
    return { watermarkMs, full: false, count: 0 };
  }

  const documents = snap.docs.map((doc) => toTypesenseDocument(doc));
  await client
    .collections(DEALS_INDEX_NAME)
    .documents()
    .import(documents, { action: "upsert" });

  const lastDoc = snap.docs[snap.docs.length - 1];
  const nextWatermarkMs = toMillis(lastDoc.data()?.updatedAt) || watermarkMs;
  return {
    watermarkMs: nextWatermarkMs,
    full: snap.docs.length === SYNC_BATCH_LIMIT,
    count: snap.docs.length,
  };
}

let syncInFlight = false;

async function runTypesenseSync() {
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    await ensureDealsCollection();
    let watermarkMs = await getWatermarkMs();
    let batches = 0;
    let full = true;
    while (full && batches < MAX_BATCHES_PER_RUN) {
      const result = await syncBatch(watermarkMs);
      if (result.count > 0) {
        watermarkMs = result.watermarkMs;
        await setWatermarkMs(watermarkMs);
      }
      full = result.full;
      batches += 1;
    }
  } catch (error) {
    console.warn("Typesense sync failed:", error.message || error);
  } finally {
    syncInFlight = false;
  }
}

// Manual maintenance utility (not called automatically) - re-syncs every
// deal from scratch, e.g. after the Typesense data dir is lost or the
// schema changes. Resets the watermark to the beginning and lets the normal
// batched sync loop drain the whole collection.
async function rebuildTypesenseIndex() {
  await setWatermarkMs(0);
  await runTypesenseSync();
}

module.exports = { runTypesenseSync, rebuildTypesenseIndex };
