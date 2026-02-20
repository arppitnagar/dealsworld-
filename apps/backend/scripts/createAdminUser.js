const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

function usage() {
  console.error(
    "Usage: node scripts/createAdminUser.js <email> <password> [displayName]",
  );
  process.exit(1);
}

async function resolveOrCreateAuthUser(email, password, displayName) {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    const updates = { password };
    if (displayName) updates.displayName = displayName;
    await admin.auth().updateUser(existing.uid, updates);
    return await admin.auth().getUser(existing.uid);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }
  }

  return admin.auth().createUser({
    email,
    password,
    displayName: displayName || undefined,
    emailVerified: true,
    disabled: false,
  });
}

async function main() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  const password = String(process.argv[3] || "");
  const displayName = String(process.argv[4] || "Admin").trim();

  if (!email || !password) usage();
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const user = await resolveOrCreateAuthUser(email, password, displayName);
  const uid = user.uid;

  await admin.auth().setCustomUserClaims(uid, {
    ...(user.customClaims || {}),
    role: "admin",
  });

  await db.collection("users").doc(uid).set(
    {
      role: "admin",
      status: "active",
      approvalStatus: "approved",
      email,
      displayName: displayName || user.displayName || "Admin",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`Admin user ready: ${email}`);
  console.log(`UID: ${uid}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
