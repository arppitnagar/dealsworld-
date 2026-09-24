import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useI18n } from "@dealsworld/shared";
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
  const { language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [titleTranslations, setTitleTranslations] = useState({});
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

  // Titles translated to the seller's selected display language. This hook
  // reads Firestore directly (see above), bypassing the backend's normal
  // localizeDeals() pass on GET /api/deals/* entirely, so titles have to be
  // translated here instead via POST /api/deals/translate-batch. Only
  // titles - not descriptions - since that's all the list cards show;
  // DealDetails translates the one deal it's showing separately.
  const translationRequestKey = useMemo(
    () => deals.map((deal) => `${deal.id}:${deal.title || ""}`).join("|"),
    [deals],
  );

  useEffect(() => {
    if (!deals.length) {
      setTitleTranslations({});
      return undefined;
    }
    let cancelled = false;
    let attempt = 0;
    const items = deals.map((deal) => ({ id: deal.id, title: deal.title || "" }));

    // The backend only waits ~1.2s for Azure before returning original text
    // (see TRANSLATION_WAIT_MS in translation.js) and keeps translating in
    // the background for next time - a cold cache (first request for a
    // given title) routinely misses that window. The buyer app's list
    // self-heals via its 4s poll; this hook has no such poll, so it needs
    // its own bounded retry or it gets stuck showing the original text
    // forever once the single request races the timeout.
    const fetchTranslations = () => {
      apiClient
        .post("/deals/translate-batch", { items, lang: language, fields: ["title"] })
        .then(({ data }) => {
          if (cancelled) return;
          const translations = data?.translations || {};
          setTitleTranslations(translations);
          attempt += 1;
          const stillUntranslated = items.some((item) => {
            const hit = translations[item.id];
            return item.title && (!hit?.title || hit.title === item.title);
          });
          if (stillUntranslated && attempt < 4 && language !== "en") {
            setTimeout(() => {
              if (!cancelled) fetchTranslations();
            }, 2500);
          }
        })
        .catch(() => {
          // A transient network hiccup shouldn't wipe out titles a previous
          // attempt already translated - just retry rather than resetting.
          attempt += 1;
          if (!cancelled && attempt < 4) {
            setTimeout(() => {
              if (!cancelled) fetchTranslations();
            }, 2500);
          }
        });
    };
    fetchTranslations();

    return () => {
      cancelled = true;
    };
    // translationRequestKey is the actual dependency (ids+titles); deals
    // itself changes reference on every snapshot even when unaffected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationRequestKey, language]);

  const localizedDeals = useMemo(
    () =>
      deals.map((deal) => {
        const hit = titleTranslations[deal.id];
        if (!hit?.title || hit.title === deal.title) return deal;
        return {
          ...deal,
          title: hit.title,
          originalTitle: deal.title,
          sourceLanguage: hit.sourceLanguage || null,
        };
      }),
    [deals, titleTranslations],
  );

  return { deals: localizedDeals, loading, sellerDisplayName };
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
