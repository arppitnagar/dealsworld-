import React, { useMemo } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import AppButton from "./AppButton";

// App-wide "are you sure?" dialog, styled to match PriceBreakupModal's
// centered-card pattern (the app's existing precedent for a popup dialog)
// instead of React Native's unstyled native Alert.alert.
export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  tone,
  singleButton = false,
  loading = false,
  icon,
  onConfirm,
  onCancel,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isSuccess = tone === "success";
  const accentColor = destructive
    ? theme.colors.danger
    : isSuccess
      ? theme.colors.success
      : theme.colors.primary;
  const accentSoft = destructive
    ? theme.colors.dangerSoft
    : isSuccess
      ? theme.colors.successSoft
      : theme.colors.primaryTintBg || theme.colors.surfaceMuted;
  const resolvedIcon =
    icon ||
    (destructive
      ? "alert-circle-outline"
      : isSuccess
        ? "checkmark-circle-outline"
        : "help-circle-outline");

  return (
    <Modal
      transparent
      visible={Boolean(visible)}
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={loading ? undefined : onCancel}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={[styles.iconCircle, { backgroundColor: accentSoft }]}>
            <Ionicons name={resolvedIcon} size={26} color={accentColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            {!singleButton ? (
              <AppButton
                title={cancelText}
                variant="secondary"
                onPress={onCancel}
                disabled={loading}
                compact
                style={styles.actionButton}
              />
            ) : null}
            <AppButton
              title={confirmText}
              variant={destructive ? "danger" : "primary"}
              onPress={onConfirm}
              loading={loading}
              compact
              style={styles.actionButton}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlayStrong,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    sheet: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      padding: 20,
      alignItems: "center",
      ...theme.shadow.card,
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    title: {
      fontSize: 17,
      fontWeight: "800",
      color: theme.colors.text,
      textAlign: "center",
    },
    message: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 20,
      width: "100%",
    },
    actionButton: {
      flex: 1,
    },
  });
