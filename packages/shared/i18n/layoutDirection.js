import { DevSettings, I18nManager, Platform } from "react-native";

// Right-to-left layout (Urdu). React Native only applies a direction change
// to native layout on the next app start - forceRTL() saves the setting on
// the device, and the running app keeps its current direction until it's
// restarted. Text itself is already shaped right-to-left by the OS, so an
// Urdu user sees Urdu immediately; only mirroring waits for the restart.
// On web the <html dir> attribute flips the layout live.
//
// Returns true when the running layout doesn't match `rtl` yet (native
// only) - LanguageSettingsScreen uses that to ask for a restart.
export function applyLayoutDirection(rtl) {
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      document.documentElement.dir = rtl ? "rtl" : "ltr";
    }
    return false;
  }
  try {
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      return true;
    }
  } catch (error) {
    // Direction is a nicety - never block the language switch over it.
  }
  return false;
}

// Development builds (Expo Go / dev client) can reload in place; a release
// build has no JS restart API without expo-updates (a native module, which
// would need a new EAS build), so there the user closes and reopens the app.
export const canRestartInApp = Platform.OS !== "web" && Boolean(__DEV__ && DevSettings?.reload);

export function restartApp() {
  if (canRestartInApp) DevSettings.reload();
}
