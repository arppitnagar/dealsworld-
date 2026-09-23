import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  deleteDoc,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

const NOTIFICATIONS_LIMIT = 50;

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
    const q = query(ref, orderBy("createdAt", "desc"), limit(NOTIFICATIONS_LIMIT));
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

  // onSnapshot already keeps `notifications` live, but pull-to-refresh needs
  // a real round-trip (not just a spinner) to be worth anything - e.g. after
  // the listener sat detached while the app was backgrounded. Bypasses the
  // local cache so it actually re-checks the server instead of resolving
  // instantly from whatever the listener already has.
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    const ref = collection(db, "users", user.uid, "notifications");
    const q = query(ref, orderBy("createdAt", "desc"), limit(NOTIFICATIONS_LIMIT));
    const snap = await getDocsFromServer(q);
    setNotifications(
      snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    );
  }, [user?.uid]);

  const deleteNotification = useCallback(
    async (id) => {
      if (!user || !id) return;
      const ref = doc(db, "users", user.uid, "notifications", id);
      await deleteDoc(ref);
    },
    [user?.uid],
  );

  // Firestore batches cap out at 500 writes, so a seller with a long history
  // needs this chunked rather than one giant batch.
  const deleteAllNotifications = useCallback(async () => {
    if (!user || notifications.length === 0) return;
    const CHUNK_SIZE = 450;
    for (let i = 0; i < notifications.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      notifications.slice(i, i + CHUNK_SIZE).forEach((item) => {
        batch.delete(doc(db, "users", user.uid, "notifications", item.id));
      });
      await batch.commit();
    }
  }, [user?.uid, notifications]);

  return {
    notifications,
    loading,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
  };
};
