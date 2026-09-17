import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, getStatusColor } from "@dealsworld/shared";
import { STATUS_FILTERS, formatCount } from "../utils/dealStatus";

// Bottom-sheet status picker for the Deals tab. Replaces the old horizontal
// chip row that used to sit under Dashboard's header - Active/Pending/
// Rejected/Expired now only live in here, same pattern as the buyer app's
// deal-category picker.
//
// Rendered as a plain absolutely-positioned overlay (not RN's native
// <Modal>) so it stays inside the screen's own view tree instead of a
// separate native window - a native Modal appearing the instant the screen
// mounts can race with SafeAreaView's safe-area measurement.
export default function SellerStatusModal({
  visible,
  onClose,
  selectedStatus,
  onSelectStatus,
  counts,
  allCount,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!visible) return null;

  const handleSelect = (key) => {
    onSelectStatus(key);
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Browse deals by status</Text>

        <TouchableOpacity
          style={styles.row}
          onPress={() => handleSelect(null)}
          activeOpacity={0.75}
        >
          <View
            style={[styles.iconCircle, { backgroundColor: theme.colors.textMuted }]}
          >
            <Ionicons name="apps-outline" size={16} color={theme.colors.onPrimary} />
          </View>
          <Text style={styles.rowLabel}>All Deals</Text>
          <Text style={styles.rowCount}>{formatCount(allCount)}</Text>
          {selectedStatus === null ? (
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
          ) : (
            <View style={styles.rowCheckSpacer} />
          )}
        </TouchableOpacity>

        {STATUS_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const accentColor = getStatusColor(filter.key, theme);
          const isSelected = selectedStatus === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={styles.row}
              onPress={() => handleSelect(filter.key)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: accentColor }]}>
                <Icon size={16} color={theme.colors.onPrimary} />
              </View>
              <Text style={styles.rowLabel}>{filter.label}</Text>
              <Text style={styles.rowCount}>{formatCount(counts[filter.key])}</Text>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              ) : (
                <View style={styles.rowCheckSpacer} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
      backgroundColor: theme.colors.overlay,
      zIndex: 20,
      elevation: 20,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 28,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      marginBottom: 14,
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.text,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    iconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.text,
    },
    rowCount: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
      marginRight: 4,
    },
    rowCheckSpacer: {
      width: 20,
    },
  });
