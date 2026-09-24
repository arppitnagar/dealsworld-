import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useI18n } from "../i18n/I18nProvider";
import { formatINR } from "../utils/formatters";

/**
 * Read-only itemized price breakup, shared by the seller's live preview
 * (while creating/editing a deal) and the buyer's breakup popup. `breakup`
 * is the object returned by utils/priceBreakup.calculatePriceBreakup.
 */
export default function PriceBreakupCard({ breakup, style }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();

  if (!breakup) return null;

  const rows = [
    { key: "base", label: t("priceBreakup.base"), value: breakup.basePrice },
    {
      key: "gst",
      label: breakup.gstPercent
        ? t("priceBreakup.gstPercent", { percent: breakup.gstPercent })
        : t("priceBreakup.gst"),
      value: breakup.gstAmount,
    },
  ];
  if (breakup.isPaidDelivery) {
    rows.push({
      key: "delivery",
      label: t("priceBreakup.delivery"),
      value: breakup.deliveryCharge,
    });
  }
  rows.push({
    key: "platformFee",
    label: t("priceBreakup.platformFee", { percent: breakup.platformFeePercent }),
    value: breakup.platformFee,
  });

  return (
    <View style={[styles.card, style]}>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{formatINR(row.value)}</Text>
        </View>
      ))}
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.totalLabel}>{t("priceBreakup.total")}</Text>
        <Text style={styles.totalValue}>{formatINR(breakup.total)}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontWeight: "600",
    },
    value: {
      fontSize: 13,
      color: theme.colors.text,
      fontWeight: "700",
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 2,
    },
    totalLabel: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "800",
    },
    totalValue: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: "800",
    },
  });
