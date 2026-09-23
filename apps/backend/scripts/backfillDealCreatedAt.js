// One-time hygiene fix, required before GET /api/deals's new cursor
// pagination ships (see apps/backend/src/routes/deals.js): the query now
// does `.orderBy("createdAt", "desc")`, and Firestore silently excludes any
// document missing the ordered field entirely from the result set. Older
// deals predating the createdAt convention would otherwise vanish from the
// buyer feed with no error. Run once: `node scripts/backfillDealCreatedAt.js`
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  const snap = await db.collection("deals").get();

  if (snap.empty) {
    console.log("No deals found.");
    return;
  }

  let batch = db.batch();
  let batchCount = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (data.createdAt) continue;

    // Fall back to updatedAt (a reasonable proxy for recency) if present,
    // otherwise a fixed old timestamp - never "now", which would incorrectly
    // bump a genuinely old deal to the top of a newest-first feed.
    const fallbackCreatedAt = data.updatedAt || admin.firestore.Timestamp.fromMillis(0);

    batch.set(doc.ref, { createdAt: fallbackCreatedAt }, { merge: true });
    batchCount += 1;
    updated += 1;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Backfill complete. Updated ${updated} deal(s) missing createdAt.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
