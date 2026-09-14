const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

function usage() {
  console.error(
    "Usage: node scripts/resetUserPassword.js <identifier> <newPassword>",
  );
  console.error(
    "Identifier can be an email, uid, or a case-insensitive match against displayName/email local-part.",
  );
  process.exit(1);
}

function isEmail(value) {
  return /\S+@\S+\.\S+/.test(String(value || "").trim());
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function getAllAuthUsers() {
  const users = [];
  let nextPageToken;

  do {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    users.push(...result.users);
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  return users;
}

function scoreMatch(user, identifier) {
  const token = normalize(identifier);
  const uid = normalize(user.uid);
  const email = normalize(user.email);
  const displayName = normalize(user.displayName);
  const emailLocalPart = email.includes("@") ? email.split("@")[0] : "";

  if (uid === token) return 100;
  if (email === token) return 95;
  if (displayName === token) return 90;
  if (emailLocalPart === token) return 85;
  if (displayName.includes(token)) return 60;
  if (email.includes(token)) return 50;
  return 0;
}

async function findBestUser(identifier) {
  const normalized = normalize(identifier);
  if (!normalized) return null;

  try {
    if (isEmail(normalized)) {
      return await admin.auth().getUserByEmail(normalized);
    }
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  try {
    return await admin.auth().getUser(normalized);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  const users = await getAllAuthUsers();
  const matches = users
    .map((user) => ({ user, score: scoreMatch(user, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) return null;

  if (
    matches.length > 1 &&
    matches[0].score === matches[1].score &&
    matches[0].score < 90
  ) {
    console.error("Multiple matching users found. Be more specific:");
    matches.slice(0, 10).forEach(({ user, score }) => {
      console.error(
        `- score=${score} uid=${user.uid} email=${user.email || "-"} displayName=${user.displayName || "-"}`,
      );
    });
    process.exit(2);
  }

  return matches[0].user;
}

async function main() {
  const identifier = String(process.argv[2] || "").trim();
  const newPassword = String(process.argv[3] || "");

  if (!identifier || !newPassword) usage();

  if (newPassword.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const user = await findBestUser(identifier);
  if (!user) {
    console.error(`No auth user found for identifier: ${identifier}`);
    process.exit(1);
  }

  await admin.auth().updateUser(user.uid, {
    password: newPassword,
    disabled: false,
  });

  console.log("Password reset successful.");
  console.log(`uid=${user.uid}`);
  console.log(`email=${user.email || ""}`);
  console.log(`displayName=${user.displayName || ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
