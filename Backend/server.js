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
    if (deal.currentJoins < deal.minThreshold) {
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
      joinedUsers,
      location,
      approved,
      vendorId,
      status: "pending", // Requires Admin Approval
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiryTime: Date.now() + 48 * 60 * 60 * 1000, // 48 Hours default
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

const PORT = process.env.PORT || 5000;
// Add this block to test in your browser
app.get("/", (req, res) => {
  res.send("DealBuddy API is running successfully!");
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
