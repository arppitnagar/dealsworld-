import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

export const useAddresses = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const ref = collection(db, "users", user.uid, "addresses");
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setAddresses(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })),
      );
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const addAddress = useCallback(
    async (payload) => {
      if (!user) return;
      const ref = collection(db, "users", user.uid, "addresses");
      const docRef = await addDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    },
    [user],
  );

  const updateAddress = useCallback(
    async (id, updates) => {
      if (!user || !id) return;
      const ref = doc(db, "users", user.uid, "addresses", id);
      await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
    },
    [user],
  );

  const removeAddress = useCallback(
    async (id) => {
      if (!user || !id) return;
      const ref = doc(db, "users", user.uid, "addresses", id);
      await deleteDoc(ref);
    },
    [user],
  );

  const setDefaultAddress = useCallback(
    async (id) => {
      if (!user || !id) return;
      const currentDefault = addresses.find((item) => item.isDefault);
      const updates = [];
      if (currentDefault?.id && currentDefault.id !== id) {
        updates.push(
          updateDoc(
            doc(db, "users", user.uid, "addresses", currentDefault.id),
            { isDefault: false, updatedAt: serverTimestamp() },
          ),
        );
      }
      updates.push(
        updateDoc(doc(db, "users", user.uid, "addresses", id), {
          isDefault: true,
          updatedAt: serverTimestamp(),
        }),
      );
      await Promise.all(updates);
    },
    [addresses, user],
  );

  return {
    addresses,
    loading,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
  };
};
