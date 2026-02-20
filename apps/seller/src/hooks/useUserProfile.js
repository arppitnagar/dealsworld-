import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
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
          role: "seller",
          approvalStatus: "approved",
          status: "active",
          theme: "light",
          createdAt: serverTimestamp(),
        };
        setDoc(ref, seed, { merge: true }).catch((error) => {
          console.warn("Failed to seed seller profile:", error);
        });
        setProfile({ id: user.uid, ...seed });
      } else {
        setProfile({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateProfile = useMemo(
    () => async (updates) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, updates, { merge: true });
    },
    [user],
  );

  return { profile, loading, updateProfile };
};
