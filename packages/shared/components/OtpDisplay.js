import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

// Read-only 6-digit code display (packages/shared/components/OtpInput.js is
// the matching entry field) — used to show a buyer their own delivery
// confirmation code once a deal has been dispatched.
export default function OtpDisplay({ code = "", length = 6 }) {
  const { theme } = useTheme();
  const digits = String(code || "").split("");
  const cells = Array.from({ length });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: "row",
          gap: 8,
          alignSelf: "flex-start",
        },
        box: {
          width: 40,
          height: 48,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.colors.infoBorder,
          backgroundColor: theme.colors.infoSoft,
          alignItems: "center",
          justifyContent: "center",
        },
        digit: {
          fontSize: 20,
          fontWeight: "900",
          color: theme.colors.primary,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.wrap}>
      {cells.map((_, index) => (
        <View key={index} style={styles.box}>
          <Text style={styles.digit}>{digits[index] || ""}</Text>
        </View>
      ))}
    </View>
  );
}
