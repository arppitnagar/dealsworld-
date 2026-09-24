import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeLanguage } from "./languages";

const LANGUAGE_KEY = "dealbuddy_language";

// Local copy of the profile's preferredLanguage, so the app opens in the
// right language before the profile snapshot arrives (same idea as
// apps/*/src/utils/themeStorage.js).
export const getStoredLanguage = async () => {
  try {
    return normalizeLanguage(await AsyncStorage.getItem(LANGUAGE_KEY));
  } catch (error) {
    return null;
  }
};

export const setStoredLanguage = async (code) => {
  try {
    if (!code) {
      await AsyncStorage.removeItem(LANGUAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(LANGUAGE_KEY, code);
  } catch (error) {
    // ignore storage errors
  }
};
