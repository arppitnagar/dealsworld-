// Creates N realistic, varied, immediately-searchable test deals directly in
// Firestore - for validating search/browse/pagination without manually
// creating deals one at a time through the seller app.
//
// Usage: node scripts/seedTestDeals.js
//   (prompts interactively for how many deals to create)
// or:    node scripts/seedTestDeals.js 25
//   (skips the prompt)
require("dotenv").config();
const readline = require("readline");
// Reuse the shared admin/db init from lib.js (which itself inits via
// firebase.js) instead of calling admin.initializeApp() again here -
// this script also needs typesenseSync.js below, which pulls in that same
// shared init, and Firebase Admin throws if you initialize the default app
// twice in one process.
const { admin, db, FieldValue } = require("../src/lib");

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Groceries",
  "Home & Kitchen",
  "Beauty",
  "Sports",
  "Books",
  "Toys",
];
const LOCATIONS = ["Mumbai", "Pune", "Delhi", "Bangalore", "Chennai", "Hyderabad"];
const DELIVERY_MODES = ["Paid Home Delivery", "Free Home Delivery", "Pick from Store"];
const TITLE_TEMPLATES = [
  (c) => `${c} Mega Sale`,
  (c) => `Bulk ${c} Deal`,
  (c) => `${c} Clearance Offer`,
  (c) => `Premium ${c} Bundle`,
  (c) => `Weekend ${c} Special`,
  (c) => `${c} Flash Discount`,
  (c) => `Group Buy: ${c}`,
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function askQuestion(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function resolveSeller() {
  const snap = await db.collection("users").where("role", "==", "seller").limit(1).get();
  if (snap.empty) {
    console.warn(
      "[seedTestDeals] No seller account found in Firestore - deals will be attributed " +
        "to a placeholder sellerId and show as \"Unknown seller\" in the app. Create a " +
        "seller account first if you want deals attributed to a real one.",
    );
    return { sellerId: "seed-script-placeholder-seller", sellerName: "Test Seller" };
  }
  const doc = snap.docs[0];
  const data = doc.data() || {};
  return {
    sellerId: doc.id,
    sellerName: data.displayName || data.fullName || data.name || "Seller",
  };
}

function buildDeal(index, seller, nowMs) {
  const category = pick(CATEGORIES);
  const city = pick(LOCATIONS);
  const title = `${pick(TITLE_TEMPLATES)(category)} #${index + 1}`;
  const originalPrice = randomInt(200, 5000);
  const discountPrice = Math.max(50, Math.round(originalPrice * (0.5 + Math.random() * 0.3)));
  const minGroupSize = randomInt(2, 10);
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    nowMs + randomInt(2, 14) * 86400000,
  );

  return {
    title,
    description: `Auto-generated test deal for search validation. Category: ${category}.`,
    category,
    categoryOther: "",
    deliveryMode: pick(DELIVERY_MODES),
    deliveryCharge: 0,
    storeAddress: "",
    pickupAddress: "",
    originalPrice,
    discountPrice,
    gstPercent: 0,
    minGroupSize,
    minThreshold: minGroupSize,
    maxGroupSize: null,
    pricingTiers: null,
    joinedUsers: 0,
    currentJoins: 0,
    location: city,
    city,
    cityLower: city.toLowerCase(),
    images: [],
    image: null,
    imageUrl: null,
    sellerId: seller.sellerId,
    sellerName: seller.sellerName,
    viewsCount: randomInt(0, 200),
    favoritesCount: randomInt(0, 20),
    leftCount: 0,
    joinEventsCount: 0,
    uniqueJoinersCount: 0,
    joinTimeSecondsSum: 0,
    avgJoinTimeSeconds: null,
    thresholdReachedAt: null,
    lastViewedAt: null,
    ratingCount: 0,
    ratingTotal: 0,
    ratingAvg: 0,
    approvalStatus: "approved",
    lifecycleStatus: "active",
    status: "active",
    approved: true,
    expiresAt,
    expiryTime: expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function main() {
  let count = Number(process.argv[2]);
  if (!Number.isFinite(count) || count <= 0) {
    const answer = await askQuestion("How many test deals do you want to create? ");
    count = Number(answer);
  }
  if (!Number.isFinite(count) || count <= 0) {
    console.error("Please provide a positive number.");
    process.exit(1);
  }
  count = Math.min(count, 500); // sane upper bound - this is a test-data tool, not a load generator

  const seller = await resolveSeller();
  const nowMs = Date.now();

  let batch = db.batch();
  let batchCount = 0;
  let created = 0;

  for (let i = 0; i < count; i += 1) {
    const ref = db.collection("deals").doc();
    batch.set(ref, buildDeal(i, seller, nowMs));
    batchCount += 1;
    created += 1;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Created ${created} test deal(s), attributed to seller ${seller.sellerId}.`);

  // Best-effort - if Typesense isn't running, deal creation above already
  // succeeded and this just means search won't see them until the normal
  // ~20s sync interval (or never, if Typesense isn't set up at all).
  try {
    const { rebuildTypesenseIndex } = require("../src/typesenseSync");
    console.log("Syncing into Typesense so they're searchable immediately...");
    await rebuildTypesenseIndex();
    console.log("Typesense sync complete - the new deals are searchable now.");
  } catch (error) {
    console.warn(
      "Could not sync to Typesense (is it running?) - the backend's normal sync " +
        "interval will pick these up automatically once it is:",
      error.message || error,
    );
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
