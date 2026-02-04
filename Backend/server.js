const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
// Download your serviceAccountKey.json from Firebase Console
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

// Add Firebase Storage reference
const bucket = admin.storage().bucket("your-project-id.appspot.com");

// Example of a Cron Job logic (simplified)
const checkExpiredDeals = async () => {
  const now = Date.now();
  const expiredDeals = await db
    .collection("deals")
    .where("status", "==", "active")
    .where("expiryTime", "<=", now)
    .get();

  expiredDeals.forEach(async (doc) => {
    const deal = doc.data();
    if (deal.joinedUsers < deal.minGroupSize) {
      await doc.ref.update({ status: "expired" });
      // Logic to trigger refunds via UPI would go here
    }
  });
};
// API: Create Group Deal
app.post("/api/deals/create", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      price,
      originalPrice,
      minGroupSize,
      joinedUsers,
      location,
      expiresAt,
      status,
      approved,
      vendorId,
      createdAt,
    } = req.body;
    const newDeal = {
      title,
      description,
      category,
      price: Number(req.body.price),
      originalPrice: Number(req.body.originalPrice),
      minGroupSize: Number(req.body.minGroupSize),
      joinedUsers: joinedUsers ?? 0,
      currentJoins: joinedUsers ?? 0,
      location,
      approved,
      vendorId,
      status: "pending", // Requires Admin Approval
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiryTime: Date.now() + 48 * 60 * 60 * 1000, // 48 Hours default
      viewsCount: 0,
      leftCount: 0,
      joinEventsCount: 0,
      avgJoinTimeSeconds: null,
      thresholdReachedAt: null,
      lastViewedAt: null,
    };
    const docRef = await db.collection("deals").add(newDeal);
    res.status(201).send({ id: docRef.id, ...newDeal });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/api/deals", async (req, res) => {
  try {
    const snapshot = await db.collection("deals").get();
    const deals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(deals);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/api/deals/vendor/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const snapshot = await db
      .collection("deals")
      .where("vendorId", "==", vendorId)
      .get();

    const deals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Record a deal view (server-side)
app.post("/api/deals/:dealId/view", async (req, res) => {
  try {
    const { dealId } = req.params;
    const dealRef = db.collection("deals").doc(dealId);
    await dealRef.update({
      viewsCount: FieldValue.increment(1),
      lastViewedAt: FieldValue.serverTimestamp(),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Join a deal
app.post("/api/deals/:dealId/join", async (req, res) => {
  try {
    const { dealId } = req.params;
    const { joinTimeSeconds } = req.body || {};

    await db.runTransaction(async (tx) => {
      const dealRef = db.collection("deals").doc(dealId);
      const snap = await tx.get(dealRef);
      if (!snap.exists) {
        throw new Error("Deal not found");
      }

      const data = snap.data();
      const currentJoins = data.currentJoins ?? data.joinedUsers ?? 0;
      const nextJoins = currentJoins + 1;
      const minGroupSize = data.minGroupSize ?? 1;

      const updates = {
        currentJoins: nextJoins,
        joinedUsers: (data.joinedUsers ?? currentJoins) + 1,
        updatedAt: FieldValue.serverTimestamp(),
      };

      const prevAvg = data.avgJoinTimeSeconds ?? 0;
      const prevCount = data.joinEventsCount ?? 0;
      if (Number.isFinite(joinTimeSeconds)) {
        const newAvg = Math.round(
          (prevAvg * prevCount + joinTimeSeconds) / (prevCount + 1),
        );
        updates.avgJoinTimeSeconds = newAvg;
        updates.joinEventsCount = prevCount + 1;
      }

      if (nextJoins >= minGroupSize && !data.thresholdReachedAt) {
        updates.thresholdReachedAt = FieldValue.serverTimestamp();
      }

      tx.update(dealRef, updates);
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Leave a deal (for drop-off tracking)
app.post("/api/deals/:dealId/leave", async (req, res) => {
  try {
    const { dealId } = req.params;
    const dealRef = db.collection("deals").doc(dealId);
    await dealRef.update({
      leftCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
// Add this block to test in your browser
app.get("/", (req, res) => {
  res.send("DealBuddy API is running successfully!");
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
