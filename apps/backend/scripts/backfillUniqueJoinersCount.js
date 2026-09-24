const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

// dealJoins doc IDs are `${dealId}_${buyerId}` (see makeJoinDocId in lib.js),
// so exactly one doc exists per buyer who ever joined a given deal,
// regardless of joinStatus ("joined" or "left") or how many times they
// left/rejoined. Counting docs per dealId therefore gives the true unique
// "ever joined" count - the same thing the /join route now maintains live
// via uniqueJoinersCount (see deals.js).

function usage() {
  console.log(
    [
      "Usage:",
      "  node scripts/backfillUniqueJoinersCount.js [--deal=<dealId>] [--dry-run]",
      "",
      "Examples:",
      "  node scripts/backfillUniqueJoinersCount.js --dry-run",
      "  node scripts/backfillUniqueJoinersCount.js",
      "  node scripts/backfillUniqueJoinersCount.js --deal=ABC123",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  let dealId = null;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--deal=")) {
      const value = arg.slice("--deal=".length).trim();
      if (value) {
        dealId = value;
      }
      continue;
    }
  }

  return { dealId, dryRun };
}

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

async function loadDeals(targetDealId) {
  if (targetDealId) {
    const snap = await db.collection("deals").doc(targetDealId).get();
    if (!snap.exists) {
      throw new Error(`Deal not found: ${targetDealId}`);
    }
    return [snap];
  }
  const snap = await db.collection("deals").get();
  return snap.docs;
}

async function loadUniqueJoinerCounts(targetDealId) {
  let query = db.collection("dealJoins");
  if (targetDealId) {
    query = query.where("dealId", "==", targetDealId);
  }

  const snap = await query.get();
  const counts = new Map();
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const dealId = String(data.dealId || "").trim();
    if (!dealId) {
      skipped += 1;
      continue;
    }
    // One doc per (dealId, buyerId) - just count it, no joinStatus filter.
    counts.set(dealId, (counts.get(dealId) || 0) + 1);
  }

  return { counts, skipped, scanned: snap.size };
}

async function backfill() {
  const { dealId, dryRun } = parseArgs(process.argv.slice(2));
  const deals = await loadDeals(dealId);
  const { counts, skipped, scanned } = await loadUniqueJoinerCounts(dealId);

  let updated = 0;
  let unchanged = 0;
  let batch = db.batch();
  let pendingWrites = 0;

  for (const dealDoc of deals) {
    const data = dealDoc.data() || {};
    const expected = counts.get(dealDoc.id) || 0;
    const current = asNumber(data.uniqueJoinersCount, 0);

    if (current === expected) {
      unchanged += 1;
      continue;
    }

    updated += 1;

    if (dryRun) {
      console.log(`[DRY-RUN] ${dealDoc.id}: uniqueJoinersCount ${current} -> ${expected}`);
      continue;
    }

    batch.set(
      dealDoc.ref,
      {
        uniqueJoinersCount: expected,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    pendingWrites += 1;

    if (pendingWrites >= 400) {
      await batch.commit();
      batch = db.batch();
      pendingWrites = 0;
    }
  }

  if (!dryRun && pendingWrites > 0) {
    await batch.commit();
  }

  console.log("Backfill complete");
  console.log(`- Deals scanned: ${deals.length}`);
  console.log(`- dealJoins scanned: ${scanned}`);
  console.log(`- dealJoins skipped (missing dealId): ${skipped}`);
  console.log(`- Deals updated: ${updated}`);
  console.log(`- Deals unchanged: ${unchanged}`);
  console.log(`- Mode: ${dryRun ? "DRY-RUN (no writes)" : "WRITE"}`);
}

backfill().catch((error) => {
  console.error("Failed to backfill uniqueJoinersCount:", error.message);
  process.exit(1);
});
