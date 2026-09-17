import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }
    // Fire-and-forget: this makes the backend's ensureUserProfile() run
    // promptly (it assigns the sequential buyerCode via an atomic counter -
    // see apps/backend/src/lib.js), instead of only happening lazily the
    // first time this buyer hits a requireRole("buyer")-gated endpoint. The
    // onSnapshot listener below picks up the resulting write automatically.
    apiClient.get("/users/me").catch(() => {});

    const ref = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      const existing = snap.exists() ? snap.data() || {} : null;
      // Seed missing defaults even when the doc already exists - a doc can
      // exist with no `role` if another writer (e.g. usePushToken.js saving
      // expoPushToken) created it first, racing ahead of this seed. Without
      // this, that account is permanently stuck failing every
      // requireRole("buyer") backend check with no way to self-heal.
      if (!existing || !existing.role) {
        const seed = {
          email: user.email || "",
          role: "buyer",
          approvalStatus: "approved",
          status: "active",
          theme: "light",
          createdAt: serverTimestamp(),
        };
        setDoc(ref, seed, { merge: true });
        setProfile({ id: user.uid, ...existing, ...seed });
      } else {
        setProfile({ id: snap.id, ...existing });
      }
      setLoading(false);
    });
    return () => unsubscribe();
    // Depend on the uid, not the user object - Firebase Auth can re-emit a
    // new (but equivalent) user object on events like app resume, and
    // re-running this effect on every such reference change tears down and
    // rebuilds the listener for no reason, briefly resetting `loading` and
    // - one level up, in App.js - the whole navigator's mounted screen tree.
  }, [user?.uid]);

  const updateProfile = useMemo(
    () => async (updates) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, updates, { merge: true });
    },
    [user?.uid],
  );

  return { profile, loading, updateProfile };
};
