import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useI18n, TopPageHeader, goBackOrNavigate } from "@dealsworld/shared";
import { useUserProfile } from "../hooks/useUserProfile";
import { setStoredThemeMode } from "../utils/themeStorage";
import { getProfileBaseStyles } from "../styles/profileStyles";

export default function ThemeSettingsScreen({ navigation }) {
  const { theme, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { updateProfile } = useUserProfile();
  const { t } = useI18n();

  const handleSelect = async (nextMode) => {
    setMode(nextMode);
    await updateProfile({ theme: nextMode });
    await setStoredThemeMode(nextMode);
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader
        title={t("themeSettings.title")}
        onBack={() => goBackOrNavigate(navigation)}
        rounded
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <Text style={styles.heroTitle}>{t("themeSettings.heroTitle")}</Text>
          <Text style={styles.heroSubtitle}>{t("themeSettings.heroSubtitle")}</Text>
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
              <Text style={styles.themeLabel}>{t("themeSettings.light")}</Text>
              <Text style={styles.themeSubLabel}>{t("themeSettings.lightSub")}</Text>
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
              <Text style={styles.themeLabel}>{t("themeSettings.dark")}</Text>
              <Text style={styles.themeSubLabel}>{t("themeSettings.darkSub")}</Text>
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

const createStyles = (theme) => {
  const base = getProfileBaseStyles(theme);
  return StyleSheet.create({
    ...base,
    card: {
      ...base.card,
      gap: 12,
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
};
