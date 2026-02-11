const express = require("express");
const {
  db,
  FieldValue,
  USERS_COLLECTION,
  ADDRESS_COLLECTION,
  ensureUserProfile,
  normalizeAddressInput,
  validateAddress,
  requireAuth,
} = require("../lib");

const router = express.Router();

router.get("/api/users/me", requireAuth, async (req, res) => {
  try {
    const profile = await ensureUserProfile(req.user.uid, {
      email: req.user.email || "",
    });
    return res.json(profile);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/api/users/me", requireAuth, async (req, res) => {
  try {
    const ref = db.collection(USERS_COLLECTION).doc(req.user.uid);
    const updates = {};
    const allowed = ["displayName", "phone", "theme", "photoUrl", "address"];
    allowed.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    updates.updatedAt = FieldValue.serverTimestamp();
    await ref.set(updates, { merge: true });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/users/me/addresses", requireAuth, async (req, res) => {
  try {
    const snap = await db
      .collection(USERS_COLLECTION)
      .doc(req.user.uid)
      .collection(ADDRESS_COLLECTION)
      .where("isDeleted", "==", false)
      .limit(200)
      .get();
    const list = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)));
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/api/users/me/addresses", requireAuth, async (req, res) => {
  try {
    const payload = normalizeAddressInput(req.body || {});
    if (!validateAddress(payload)) {
      return res.status(400).json({ error: "Invalid address fields" });
    }
    const ref = db.collection(USERS_COLLECTION).doc(req.user.uid).collection(ADDRESS_COLLECTION);
    const docRef = ref.doc();
    const batch = db.batch();

    if (payload.isDefault) {
      const existing = await ref.where("isDeleted", "==", false).where("isDefault", "==", true).get();
      existing.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false, updatedAt: FieldValue.serverTimestamp() });
      });
    }

    batch.set(docRef, {
      ...payload,
      isDeleted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/api/users/me/addresses/:addressId", requireAuth, async (req, res) => {
  try {
    const { addressId } = req.params;
    const payload = normalizeAddressInput(req.body || {});
    const ref = db.collection(USERS_COLLECTION).doc(req.user.uid).collection(ADDRESS_COLLECTION).doc(addressId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Address not found" });

    const batch = db.batch();
    if (payload.isDefault) {
      const parent = db.collection(USERS_COLLECTION).doc(req.user.uid).collection(ADDRESS_COLLECTION);
      const existing = await parent.where("isDeleted", "==", false).where("isDefault", "==", true).get();
      existing.forEach((doc) => {
        if (doc.id !== addressId) {
          batch.update(doc.ref, { isDefault: false, updatedAt: FieldValue.serverTimestamp() });
        }
      });
    }

    batch.set(
      ref,
      {
        ...payload,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/api/users/me/addresses/:addressId", requireAuth, async (req, res) => {
  try {
    const { addressId } = req.params;
    const ref = db.collection(USERS_COLLECTION).doc(req.user.uid).collection(ADDRESS_COLLECTION).doc(addressId);
    await ref.set(
      {
        isDeleted: true,
        isDefault: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
