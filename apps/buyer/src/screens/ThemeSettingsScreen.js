import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@dealsworld/shared";
import { useUserProfile } from "../hooks/useUserProfile";
import { setStoredThemeMode } from "../utils/themeStorage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ThemeSettingsScreen({ navigation }) {
  const { theme, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { updateProfile } = useUserProfile();

  const handleSelect = async (nextMode) => {
    setMode(nextMode);
    await updateProfile({ theme: nextMode });
    await setStoredThemeMode(nextMode);
  };

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.headerBar,
          { paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={theme.colors.onPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Theme</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <Text style={styles.heroTitle}>Choose your vibe</Text>
          <Text style={styles.heroSubtitle}>
            Switch between light and dark themes anytime.
          </Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={[
              styles.themeOption,
              mode === "light" && styles.themeOptionActive,
            ]}
            onPress={() => handleSelect("light")}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="sunny-outline"
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.themeLabel}>Light Mode</Text>
              <Text style={styles.themeSubLabel}>Bright & clean</Text>
            </View>
            {mode === "light" ? (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors.primary}
              />
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              mode === "dark" && styles.themeOptionActive,
            ]}
            onPress={() => handleSelect("dark")}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="moon-outline"
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.themeLabel}>Dark Mode</Text>
              <Text style={styles.themeSubLabel}>Easy on the eyes</Text>
            </View>
            {mode === "dark" ? (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors.primary}
              />
            ) : null}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.dashboardBg,
    },
    headerBar: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.onPrimarySoft,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.onPrimarySoft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 0,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 32,
      gap: 18,
    },
    heroCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: 24,
      padding: 18,
      overflow: "hidden",
      ...theme.shadow.card,
    },
    heroAccent: {
      width: 56,
      height: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.onPrimary,
      opacity: 0.7,
      marginBottom: 10,
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    heroSubtitle: {
      fontSize: 12,
      marginTop: 6,
      color: theme.colors.onPrimaryMuted,
    },
    card: {
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
      ...theme.shadow.card,
    },
    themeOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    optionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.infoSoft,
    },
    optionText: {
      flex: 1,
      gap: 2,
    },
    themeOptionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.infoSoft,
    },
    themeLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.text,
    },
    themeSubLabel: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
  });
