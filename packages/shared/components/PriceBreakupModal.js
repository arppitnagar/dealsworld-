import React, { useMemo } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useI18n } from "../i18n/I18nProvider";
import PriceBreakupCard from "./PriceBreakupCard";

/**
 * Popup used at the buyer end to show the seller-configured price breakup
 * next to the payment button, in non-editable form. Closes via the X button
 * top-right or the backdrop.
 */
export default function PriceBreakupModal({
  visible,
  onClose,
  breakup,
  title = "Price Breakup",
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal
      transparent
      visible={Boolean(visible)}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel={t("priceBreakup.close")}
            >
              <X size={16} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <PriceBreakupCard breakup={breakup} />
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
      padding: 18,
      gap: 14,
      ...theme.shadow.card,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.text,
    },
    closeButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
    },
  });
