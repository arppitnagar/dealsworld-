import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../theme/ThemeProvider";

// QR counterpart to OtpDisplay.js - shown to a buyer on a pickup deal once
// they've paid, instead of a typed OTP. The seller scans it from the "Scan"
// tab (apps/seller ScanQrScreen) to confirm pickup, no buyer-side action
// needed.
export default function PickupQrDisplay({ value = "", size = 180 }) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignSelf: "center",
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.infoBorder,
          backgroundColor: theme.colors.infoSoft,
        },
        inner: {
          backgroundColor: "#fff",
          padding: 12,
          borderRadius: 8,
        },
      }),
    [theme],
  );

  if (!value) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <QRCode value={value} size={size} />
      </View>
    </View>
  );
}
