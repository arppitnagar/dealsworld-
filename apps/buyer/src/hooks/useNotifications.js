import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const ref = collection(db, "users", user.uid, "notifications");
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setNotifications(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = useMemo(
    () =>
      notifications.filter((item) => !item.readAt && !item.isRead).length,
    [notifications],
  );

  const markNotificationRead = useCallback(
    async (id) => {
      if (!user || !id) return;
      const ref = doc(db, "users", user.uid, "notifications", id);
      await updateDoc(ref, {
        isRead: true,
        readAt: serverTimestamp(),
      });
    },
    [user],
  );

  return {
    notifications,
    loading,
    unreadCount,
    markNotificationRead,
  };
};
