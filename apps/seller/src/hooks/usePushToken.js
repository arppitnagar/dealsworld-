import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "./useUserProfile";

// Notifications that arrive while the app is in the foreground still show
// as a system alert - without this handler they'd be silently swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Registers this device for push notifications and saves the Expo push
// token onto the signed-in user's profile (users/{uid}.expoPushToken), where
// the backend's pushNotification() helper reads it from
// (apps/backend/src/lib.js). Only works in a custom dev client / standalone
// build - Expo Go dropped remote push support in SDK 53+.
export function usePushToken() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const storedTokenRef = useRef(undefined);
  storedTokenRef.current = profile?.expoPushToken;

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    (async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let status = existingStatus;
      if (status !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== "granted") return;

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (cancelled || !token) return;
        // Skip the write if the stored token already matches - this effect
        // re-runs on every login, so without this check every login issues
        // a Firestore write even when nothing actually changed.
        if (storedTokenRef.current === token) return;
        await setDoc(
          doc(db, "users", user.uid),
          { expoPushToken: token },
          { merge: true },
        );
      } catch (error) {
        console.warn("Failed to register push token:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);
}
