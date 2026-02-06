import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "dealbuddy_theme_mode";

export const getStoredThemeMode = async () => {
  try {
    const value = await AsyncStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark") return value;
    return null;
  } catch (error) {
    return null;
  }
};

export const setStoredThemeMode = async (mode) => {
  try {
    if (!mode) {
      await AsyncStorage.removeItem(THEME_KEY);
      return;
    }
    await AsyncStorage.setItem(THEME_KEY, mode);
  } catch (error) {
    // ignore storage errors
  }
};
