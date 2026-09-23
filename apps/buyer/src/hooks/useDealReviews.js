import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

const REVIEW_COLLECTION = "reviews";
const REVIEWS_LIMIT = 100;

export const useDealReviews = (dealId) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealId) {
      setReviews([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const ref = collection(db, "deals", dealId, REVIEW_COLLECTION);
    const q = query(ref, orderBy("createdAt", "desc"), limit(REVIEWS_LIMIT));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const next = [];
        snap.forEach((docSnap) => {
          next.push({ id: docSnap.id, ...(docSnap.data() || {}) });
        });
        setReviews(next);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [dealId]);

  const submitReview = useCallback(
    async ({ rating, comment, displayName }) => {
      if (!dealId) throw new Error("Deal not found");
      if (!user?.uid) throw new Error("Login required");

      const ratingValue = Number(rating);
      if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        throw new Error("Select a rating between 1 and 5");
      }

      const reviewRef = doc(db, "deals", dealId, REVIEW_COLLECTION, user.uid);
      const dealRef = doc(db, "deals", dealId);

      await runTransaction(db, async (tx) => {
        const [dealSnap, reviewSnap] = await Promise.all([
          tx.get(dealRef),
          tx.get(reviewRef),
        ]);

        const dealData = dealSnap.exists() ? dealSnap.data() || {} : {};
        const ratingCountRaw = Number(dealData.ratingCount) || 0;
        const ratingTotalRaw = Number(dealData.ratingTotal) || 0;

        const prevRating = reviewSnap.exists()
          ? Number(reviewSnap.data()?.rating) || 0
          : 0;

        const nextCount = reviewSnap.exists()
          ? ratingCountRaw
          : ratingCountRaw + 1;
        const nextTotal = reviewSnap.exists()
          ? ratingTotalRaw - prevRating + ratingValue
          : ratingTotalRaw + ratingValue;

        const nextAverage =
          nextCount > 0
            ? Number((nextTotal / nextCount).toFixed(2))
            : 0;

        tx.set(
          reviewRef,
          {
            rating: ratingValue,
            comment: comment?.trim() || "",
            userId: user.uid,
            userName: displayName || user?.email || "Buyer",
            updatedAt: serverTimestamp(),
            createdAt: reviewSnap.exists()
              ? reviewSnap.data()?.createdAt || serverTimestamp()
              : serverTimestamp(),
          },
          { merge: true },
        );

        tx.set(
          dealRef,
          {
            ratingCount: nextCount,
            ratingTotal: nextTotal,
            ratingAvg: nextAverage,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      });
    },
    [dealId, user],
  );

  const myReview = useMemo(() => {
    if (!user?.uid) return null;
    return reviews.find((item) => item.userId === user.uid) || null;
  }, [reviews, user?.uid]);

  return {
    reviews,
    myReview,
    loading,
    submitReview,
  };
};
