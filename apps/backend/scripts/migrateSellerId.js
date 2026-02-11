const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

const COLLECTION = "deals";
const BATCH_LIMIT = 400;

async function main() {
  const snap = await db.collection(COLLECTION).get();
  let batch = db.batch();
  let batchCount = 0;
  let updated = 0;

  const missing = [];
  snap.forEach((doc) => {
    const data = doc.data() || {};
    if (!data.sellerId) {
      missing.push(doc.id);
    }
  });

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Deals missing sellerId: ${missing.length}`);
  if (missing.length > 0) {
    console.log(missing.slice(0, 50));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
