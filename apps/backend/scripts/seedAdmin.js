const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

async function main() {
  const uid = process.argv[2];
  const role = (process.argv[3] || "admin").toLowerCase();

  if (!uid) {
    console.error("Usage: node scripts/seedAdmin.js <uid> [role]");
    process.exit(1);
  }

  let authUser = null;
  try {
    authUser = await admin.auth().getUser(uid);
  } catch (error) {
    console.warn("Auth user not found, seeding profile anyway.");
  }

  const payload = {
    role,
    status: "active",
    approvalStatus: "approved",
    email: authUser?.email || "",
    displayName: authUser?.displayName || "",
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  };

  await db.collection("users").doc(uid).set(payload, { merge: true });
  console.log(`Seeded ${role} profile for ${uid}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
