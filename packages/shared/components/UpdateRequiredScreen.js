import React from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { theme } from "../theme/theme";
import AppButton from "./ui/AppButton";

const DEFAULT_MESSAGE =
  "This version of the app is no longer supported. Please update to the latest version to keep using DealsWorld.";

// Full-screen, non-dismissible gate rendered in place of the whole app when
// the installed build is older than the backend's configured minVersion.
export default function UpdateRequiredScreen({
  title = "Update required",
  message = DEFAULT_MESSAGE,
  updateUrl,
}) {
  const handleUpdate = () => {
    if (!updateUrl) return;
    Linking.openURL(updateUrl).catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>!</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {!!updateUrl && (
        <AppButton
          title="Update now"
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
