const express = require("express");
const {
  db,
  DEALS_COLLECTION,
  DEAL_JOINS_COLLECTION,
  requireAuth,
  getSellerId,
  pushNotification,
} = require("../lib");

const router = express.Router();

const MESSAGE_PREVIEW_LENGTH = 200;

async function getJoinedBuyerIds(dealId) {
  const snap = await db
    .collection(DEAL_JOINS_COLLECTION)
    .where("dealId", "==", dealId)
    .where("joinStatus", "==", "joined")
    .get();
  return snap.docs.map((doc) => doc.data()?.buyerId).filter(Boolean);
}

// Called by the seller/buyer chat screens right after they write a message
// to deals/{dealId}/messages via the client Firestore SDK (that write itself
// stays direct-to-Firestore for realtime delivery to whoever has the chat
// open; this endpoint is purely for notifying participants who don't).
router.post("/api/deals/:dealId/chat-notify", requireAuth, async (req, res) => {
  try {
    const { dealId } = req.params;
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const dealSnap = await db.collection(DEALS_COLLECTION).doc(dealId).get();
    if (!dealSnap.exists) {
      return res.status(404).json({ error: "Deal not found" });
    }
    const deal = dealSnap.data();
    const sellerId = getSellerId(deal);
    const buyerIds = await getJoinedBuyerIds(dealId);

    const senderId = req.user.uid;
    const isParticipant = senderId === sellerId || buyerIds.includes(senderId);
    if (!isParticipant) {
      return res.status(403).json({ error: "Not a participant of this deal" });
    }

    const recipientIds = [sellerId, ...buyerIds].filter(
      (uid, index, all) => uid && uid !== senderId && all.indexOf(uid) === index,
    );

    const title = `New message · ${deal.title || "Deal chat"}`;
    const body =
      message.length > MESSAGE_PREVIEW_LENGTH
        ? `${message.slice(0, MESSAGE_PREVIEW_LENGTH)}…`
        : message;

    await Promise.all(
      recipientIds.map((userId) =>
        pushNotification({
          userId,
          type: "chat",
          title,
          body,
          meta: { dealId },
        }),
      ),
    );

    return res.json({ ok: true, notified: recipientIds.length });
  } catch (error) {
    console.error("chat-notify failed:", error);
    return res.status(500).json({ error: "Failed to notify participants" });
  }
});

module.exports = router;
