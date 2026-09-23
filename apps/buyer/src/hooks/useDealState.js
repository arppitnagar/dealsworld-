import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

const DEAL_STATE_COLLECTION = "dealStates";

const DealStateContext = createContext(null);

// The actual listener + mutators, run exactly once by DealStateProvider.
// Every screen that needs join/favorite/viewed state calls useDealState()
// below, which reads this shared value instead of opening its own
// listener - previously HomeScreen, DealsScreen, DealDetailsScreen, and
// SearchScreen each mounted an independent onSnapshot on the same
// (unbounded, ever-growing) users/{uid}/dealStates collection.
function useDealStateInternal() {
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

  const replaceLocalState = useCallback((dealId, value) => {
    if (!dealId) return;
    setStateMap((prev) => {
      const next = new Map(prev);
      if (value === undefined) {
        next.delete(dealId);
      } else {
        next.set(dealId, value);
      }
      return next;
    });
  }, []);

  const setDealState = useCallback(
    async (dealId, updates, serverUpdates) => {
      if (!user?.uid || !dealId) return;
      const previous = stateMap.get(dealId);
      applyLocalUpdate(dealId, updates);
      const ref = doc(db, "users", user.uid, DEAL_STATE_COLLECTION, dealId);
      try {
        await setDoc(
          ref,
          {
            ...updates,
            ...serverUpdates,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        // Roll back the optimistic flip so the button doesn't keep showing
        // a joined/left state that never actually persisted.
        replaceLocalState(dealId, previous);
        throw error;
      }
    },
    [applyLocalUpdate, replaceLocalState, stateMap, user?.uid],
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
      if (!user?.uid || !dealId) return false;
      let nextValue = false;
      await runTransaction(db, async (tx) => {
        const stateRef = doc(
          db,
          "users",
          user.uid,
          DEAL_STATE_COLLECTION,
          dealId,
        );
        const dealRef = doc(db, "deals", dealId);
        const stateSnap = await tx.get(stateRef);
        const dealSnap = await tx.get(dealRef);
        const prevValue = stateSnap.exists()
          ? Boolean(stateSnap.data()?.favorite)
          : false;
        nextValue = !prevValue;

        tx.set(
          stateRef,
          {
            favorite: nextValue,
            favoriteAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        if (dealSnap.exists()) {
          const dealData = dealSnap.data() || {};
          const currentCount = Number.isFinite(
            Number(dealData.favoritesCount),
          )
            ? Number(dealData.favoritesCount)
            : 0;
          const updatedCount = Math.max(
            0,
            currentCount + (nextValue ? 1 : -1),
          );
          tx.update(dealRef, {
            favoritesCount: updatedCount,
            updatedAt: serverTimestamp(),
          });
        }
      });
      applyLocalUpdate(dealId, { favorite: nextValue });
      return nextValue;
    },
    [applyLocalUpdate, user?.uid],
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
}

export function DealStateProvider({ children }) {
  const value = useDealStateInternal();
  return (
    <DealStateContext.Provider value={value}>
      {children}
    </DealStateContext.Provider>
  );
}

export const useDealState = () => {
  const context = useContext(DealStateContext);
  if (!context) {
    throw new Error("useDealState must be used within a DealStateProvider");
  }
  return context;
};
