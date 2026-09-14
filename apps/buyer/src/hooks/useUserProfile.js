import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

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
    const ref = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        const seed = {
          email: user.email || "",
          role: "buyer",
          approvalStatus: "approved",
          status: "active",
          theme: "light",
          createdAt: serverTimestamp(),
        };
        setDoc(ref, seed, { merge: true });
        setProfile({ id: user.uid, ...seed });
      } else {
        setProfile({ id: snap.id, ...snap.data() });
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
