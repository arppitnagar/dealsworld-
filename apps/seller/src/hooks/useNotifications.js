import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  writeBatch,
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
    // Depend on the uid, not the user object - see useUserProfile.js for why.
  }, [user?.uid]);

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
    [user?.uid],
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter((item) => !item.readAt && !item.isRead);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((item) => {
      const ref = doc(db, "users", user.uid, "notifications", item.id);
      batch.update(ref, { isRead: true, readAt: serverTimestamp() });
    });
    await batch.commit();
  }, [user?.uid, notifications]);

  return {
    notifications,
    loading,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  };
};
