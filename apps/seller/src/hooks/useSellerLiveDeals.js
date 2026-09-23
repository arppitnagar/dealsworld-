import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "./useUserProfile";
import apiClient from "../api/client";

// Live Firestore subscription for the current seller's own deals, shared by
// the Dashboard and Deals tabs so both screens see the exact same list -
// only what each screen does with it (which slice, sorted/filtered how)
// differs.
export function useSellerLiveDeals() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const dealCodeRequested = useRef(new Set());

  const sellerDisplayName = useMemo(() => {
    const explicitName =
      profile?.displayName || profile?.fullName || profile?.name || "";
    if (String(explicitName).trim()) {
      return String(explicitName).trim();
    }
    if (user?.displayName && String(user.displayName).trim()) {
      return String(user.displayName).trim();
    }
    if (user?.email && String(user.email).includes("@")) {
      return String(user.email).split("@")[0];
    }
    return "Seller";
  }, [profile, user]);

  useEffect(() => {
    if (!user?.uid) {
      setDeals([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const dealsQuery = query(
      collection(db, "deals"),
      where("sellerId", "==", user.uid),
    );
    const unsubscribe = onSnapshot(
      dealsQuery,
      (snapshot) => {
        const dealsList = [];
        const nowMs = Date.now();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const currentJoins = data.currentJoins ?? data.joinedUsers ?? 0;
          const minGroupSize = data.minGroupSize ?? 1;
          const shouldSetThreshold =
            !data.thresholdReachedAt && currentJoins >= minGroupSize;

          if (shouldSetThreshold) {
            updateDoc(docSnap.ref, {
              thresholdReachedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }).catch((error) => {
              console.error("Failed to update deal:", error);
            });
          }

          dealsList.push({
            id: docSnap.id,
            ...data,
            thresholdReachedAt: shouldSetThreshold
              ? new Date(nowMs)
              : data.thresholdReachedAt,
          });
        });

        dealsList.sort((a, b) => {
          const aMs = getCreatedMs(a);
          const bMs = getCreatedMs(b);
          return bMs - aMs;
        });

        // This hook reads Firestore directly, so it never goes through the
        // backend's lazy dealCode assignment (see maybeAssignDealCode in
        // apps/backend/src/lib.js) that runs on GET /api/deals/*. Without
        // this, a deal created client-side (CreateDealScreen's addDoc) would
        // show its raw Firestore doc ID forever. Ping the backend once per
        // deal to backfill dealCode - the write lands back in Firestore and
        // this listener picks it up on the next snapshot.
        dealsList.forEach((deal) => {
          if (deal.dealCode || dealCodeRequested.current.has(deal.id)) return;
          dealCodeRequested.current.add(deal.id);
          apiClient.get(`/deals/${deal.id}`).catch(() => {
            dealCodeRequested.current.delete(deal.id);
          });
        });

        setDeals(dealsList);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return { deals, loading, sellerDisplayName };
}

function getCreatedMs(deal) {
  const value = deal?.createdAt;
  if (!value) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
