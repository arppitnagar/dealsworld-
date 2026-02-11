const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = path.join(
  __dirname,
  "..",
  "serviceAccountKey.json",
);
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { FieldValue, FieldPath, Timestamp } = admin.firestore;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

const toMillis = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    const ms = date instanceof Date ? date.getTime() : NaN;
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value === "number") {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    const nanos = value.nanoseconds ?? value._nanoseconds ?? 0;
    if (typeof seconds === "number") {
      return seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }
  return null;
};

const addFiveDaysPreserveType = (value) => {
  const ms = toMillis(value);
  if (ms === null) return null;
  const nextMs = ms + FIVE_DAYS_MS;

  if (typeof value === "string") {
    return new Date(nextMs).toISOString();
  }
  if (typeof value === "number") {
    return value < 1e12 ? Math.floor(nextMs / 1000) : nextMs;
  }
  if (value instanceof Date) {
    return new Date(nextMs);
  }
  if (typeof value?.toDate === "function") {
    return Timestamp.fromMillis(nextMs);
  }
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    if (typeof seconds === "number") {
      return Timestamp.fromMillis(nextMs);
    }
  }
  return Timestamp.fromMillis(nextMs);
};

async function bumpExpiresAt() {
  let lastDoc = null;
  let scanned = 0;
  let updated = 0;

  while (true) {
    let query = db.collection("deals").orderBy(FieldPath.documentId()).limit(400);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await query.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((docSnap) => {
      scanned += 1;
      const data = docSnap.data() || {};
      const updates = {};

      if (data.expiresAt !== undefined) {
        const nextValue = addFiveDaysPreserveType(data.expiresAt);
        if (nextValue !== null) updates.expiresAt = nextValue;
      }

      if (data.expiryTime !== undefined) {
        const nextValue = addFiveDaysPreserveType(data.expiryTime);
        if (nextValue !== null) updates.expiryTime = nextValue;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = FieldValue.serverTimestamp();
        batch.update(docSnap.ref, updates);
        updated += 1;
      }
    });

    await batch.commit();
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  console.log(`Scanned ${scanned} deals. Updated ${updated}.`);
}

bumpExpiresAt()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
