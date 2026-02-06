import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppButton, theme } from "@dealsworld/shared";
import { useAuth } from "../context/AuthContext";

export default function RoleMismatchScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Buyer account detected</Text>
      <Text style={styles.subtitle}>
        Please use the Buyer app to access buyer features.
      </Text>
      <AppButton title="Logout" onPress={logout} style={styles.button} />
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
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
  },
});
