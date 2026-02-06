import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

const DEAL_STATE_COLLECTION = "dealStates";

export const useDealState = () => {
  const { user } = useAuth();
  const [stateMap, setStateMap] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setStateMap(new Map());
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const ref = collection(db, "users", user.uid, DEAL_STATE_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const next = new Map();
        snap.forEach((docSnap) => {
          next.set(docSnap.id, docSnap.data() || {});
        });
        setStateMap(next);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const applyLocalUpdate = useCallback((dealId, updates) => {
    if (!dealId) return;
    setStateMap((prev) => {
      const next = new Map(prev);
      const current = next.get(dealId) || {};
      next.set(dealId, { ...current, ...updates });
      return next;
    });
  }, []);

  const setDealState = useCallback(
    async (dealId, updates, serverUpdates) => {
      if (!user?.uid || !dealId) return;
      applyLocalUpdate(dealId, updates);
      const ref = doc(db, "users", user.uid, DEAL_STATE_COLLECTION, dealId);
      await setDoc(
        ref,
        {
          ...updates,
          ...serverUpdates,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [applyLocalUpdate, user?.uid],
  );

  const markViewed = useCallback(
    (dealId) =>
      setDealState(dealId, { viewed: true }, { viewedAt: serverTimestamp() }),
    [setDealState],
  );

  const markJoined = useCallback(
    (dealId) =>
      setDealState(dealId, { joined: true }, { joinedAt: serverTimestamp() }),
    [setDealState],
  );

  const unmarkJoined = useCallback(
    (dealId) =>
      setDealState(dealId, { joined: false }, { leftAt: serverTimestamp() }),
    [setDealState],
  );

  const toggleFavorite = useCallback(
    async (dealId) => {
      if (!dealId) return false;
      const current = stateMap.get(dealId)?.favorite;
      const nextValue = !current;
      await setDealState(
        dealId,
        { favorite: nextValue },
        { favoriteAt: serverTimestamp() },
      );
      return nextValue;
    },
    [setDealState, stateMap],
  );

  const setDeliveryAddress = useCallback(
    async (dealId, address, deliveryMode) => {
      if (!dealId || !address) return;
      const snapshot = {
        id: address.id,
        label: address.label || "",
        name: address.name || "",
        phone: address.phone || "",
        line1: address.line1 || "",
        line2: address.line2 || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
      };
      await setDealState(
        dealId,
        {
          deliveryAddressId: address.id,
          deliveryAddress: snapshot,
          deliveryMode: deliveryMode || "",
        },
        { deliveryAddressAt: serverTimestamp() },
      );
    },
    [setDealState],
  );

  const { viewedIds, favoriteIds, joinedIds } = useMemo(() => {
    const viewed = new Set();
    const favorite = new Set();
    const joined = new Set();

    stateMap.forEach((value, dealId) => {
      if (value?.viewed) viewed.add(dealId);
      if (value?.favorite) favorite.add(dealId);
      if (value?.joined) joined.add(dealId);
    });

    return { viewedIds: viewed, favoriteIds: favorite, joinedIds: joined };
  }, [stateMap]);

  return {
    dealStates: stateMap,
    viewedIds,
    favoriteIds,
    joinedIds,
    markViewed,
    toggleFavorite,
    markJoined,
    unmarkJoined,
    setDeliveryAddress,
    loading,
  };
};
