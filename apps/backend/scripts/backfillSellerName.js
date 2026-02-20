const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

function usage() {
  console.error(
    "Usage: node scripts/backfillSellerName.js <currentSellerId> <sellerName> [newSellerId]",
  );
  process.exit(1);
}

async function main() {
  const currentSellerId = String(process.argv[2] || "").trim();
  const sellerName = String(process.argv[3] || "").trim();
  const newSellerId = String(process.argv[4] || "").trim();

  if (!currentSellerId || !sellerName) usage();

  const snap = await db
    .collection("deals")
    .where("sellerId", "==", currentSellerId)
    .get();

  if (snap.empty) {
    console.log("No deals found for sellerId:", currentSellerId);
    process.exit(0);
  }

  let batch = db.batch();
  let count = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const payload = {
      sellerName,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (newSellerId) {
      payload.sellerId = newSellerId;
    }

    const existingSellerName = String(data.sellerName || "").trim();
    const shouldUpdate =
      !existingSellerName ||
      existingSellerName === currentSellerId ||
      Boolean(newSellerId && String(data.sellerId || "").trim() !== newSellerId);

    if (!shouldUpdate) continue;

    batch.set(doc.ref, payload, { merge: true });
    count += 1;
    updated += 1;

    if (count >= 400) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(
    `Backfill complete. Updated ${updated} deal(s) for sellerId ${currentSellerId}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
