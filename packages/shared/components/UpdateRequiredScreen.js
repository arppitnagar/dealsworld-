import React from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { theme } from "../theme/theme";
import AppButton from "./ui/AppButton";
import { useI18n } from "../i18n/I18nProvider";

// Full-screen, non-dismissible gate rendered in place of the whole app when
// the installed build is older than the backend's configured minVersion.
export default function UpdateRequiredScreen({
  title,
  message,
  updateUrl,
}) {
  const { t } = useI18n();
  const handleUpdate = () => {
    if (!updateUrl) return;
    Linking.openURL(updateUrl).catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>!</Text>
      </View>
      <Text style={styles.title}>{title || t("updateRequired.title")}</Text>
      <Text style={styles.message}>{message || t("updateRequired.message")}</Text>
      {!!updateUrl && (
        <AppButton
          title={t("updateRequired.button")}
          onPress={handleUpdate}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.dashboardBg,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.dangerSoftLight,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.dangerDark,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
    maxWidth: 320,
  },
  button: {
    width: 220,
  },
});
