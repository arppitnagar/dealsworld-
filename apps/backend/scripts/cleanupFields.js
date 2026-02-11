const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { FieldValue, FieldPath } = admin.firestore;

const PAGE_SIZE = 400;

function parseArg(name) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : "";
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function cleanupCollection(collectionName, fields) {
  let lastDoc = null;
  let updatedCount = 0;

  while (true) {
    let query = db.collection(collectionName).orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;

    const batch = db.batch();
    let batchCount = 0;

    snap.docs.forEach((doc) => {
      const data = doc.data() || {};
      const hasAny = fields.some((field) =>
        Object.prototype.hasOwnProperty.call(data, field),
      );
      if (!hasAny) return;

      const updates = {};
      fields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
          updates[field] = FieldValue.delete();
        }
      });
      updates.updatedAt = FieldValue.serverTimestamp();

      batch.update(doc.ref, updates);
      batchCount += 1;
      updatedCount += 1;
    });

    if (batchCount > 0) {
      await batch.commit();
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }

  console.log(`${collectionName}: updated ${updatedCount} documents`);
  return updatedCount;
}

async function main() {
  const collections = parseCsv(parseArg("collections"));
  const fields = parseCsv(parseArg("fields"));

  if (collections.length === 0 || fields.length === 0) {
    console.log(
      "Usage: node scripts/cleanupFields.js --collections=deals,dealJoins,payments --fields=fieldA,fieldB",
    );
    process.exit(1);
  }

  for (const name of collections) {
    await cleanupCollection(name, fields);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
