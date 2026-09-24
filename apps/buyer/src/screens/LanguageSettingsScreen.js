import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useTheme,
  useI18n,
  TopPageHeader,
  LANGUAGES,
  AppButton,
  canRestartInApp,
  restartApp,
} from "@dealsworld/shared";
import { useUserProfile } from "../hooks/useUserProfile";
import { getProfileBaseStyles } from "../styles/profileStyles";

export default function LanguageSettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { language, setLanguage, needsRestart, t } = useI18n();
  const { updateProfile } = useUserProfile();

  const handleSelect = async (code) => {
    if (code === language) return;
    // Switch locally first (instant, and cached for next launch), then save
    // to the profile so it follows the buyer to other devices. Deal lists
    // refetch on their own - language is part of their query keys.
    setLanguage(code);
    await updateProfile({ preferredLanguage: code });
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader
        title={t("languageSettings.title")}
        onBack={() => navigation.goBack()}
        rounded
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <Text style={styles.heroTitle}>{t("languageSettings.heroTitle")}</Text>
          <Text style={styles.heroSubtitle}>{t("languageSettings.heroSubtitle")}</Text>
        </View>

        {needsRestart ? (
          <View style={styles.restartCard}>
            <Text style={styles.optionLabel}>{t("languageSettings.restartTitle")}</Text>
            <Text style={styles.optionSubLabel}>
              {canRestartInApp
                ? t("languageSettings.restartMessage")
                : t("languageSettings.restartManual")}
            </Text>
            {canRestartInApp ? (
              <AppButton title={t("languageSettings.restartNow")} onPress={restartApp} />
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          {LANGUAGES.map((option) => {
            const isActive = option.code === language;
            return (
              <TouchableOpacity
                key={option.code}
                style={[styles.option, isActive && styles.optionActive]}
                onPress={() => handleSelect(option.code)}
              >
                <View style={styles.optionIcon}>
                  <Ionicons
                    name="language-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.nativeName}</Text>
                  <Text style={styles.optionSubLabel}>
                    {option.uiTranslated || option.code === "en"
                      ? option.englishName
                      : `${option.englishName} · ${t("languageSettings.menusInEnglish")}`}
                  </Text>
                </View>
                {isActive ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={theme.colors.primary}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
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
    option: {
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
    optionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.infoSoft,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.text,
    },
    optionSubLabel: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    restartCard: {
      ...base.card,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
  });
};
