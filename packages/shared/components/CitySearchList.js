import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { Search } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

// Shared searchable city list - used both as the seller's City field
// (allowCustom: typing a name not in `cities` offers a "Use ..." row so a
// brand-new city can still be entered) and as the buyer's default-location
// picker (showAllOption: a pinned "All Cities" row that clears the filter).
// Single-tap select, no separate confirm step - matches how the existing
// Category/Delivery Mode pickers in CreateDealScreen.js already behave.
export default function CitySearchList({
  cities = [],
  selectedCity = null,
  onSelect,
  allowCustom = false,
  showAllOption = false,
  allOptionLabel = "All Cities",
  style,
  maxHeight = 420,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();

  const filtered = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.toLowerCase().includes(q));
  }, [cities, trimmedQuery]);

  const hasExactMatch = useMemo(
    () => cities.some((c) => c.toLowerCase() === trimmedQuery.toLowerCase()),
    [cities, trimmedQuery],
  );
  const showCustomRow = allowCustom && trimmedQuery.length > 0 && !hasExactMatch;

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.searchRow}>
        <Search size={16} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search city"
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
      </View>

      <FlatList
        // maxHeight (not flex:1) - this list is used both inside an
        // auto-sized modal card (seller's City picker) and a full-screen
        // container (buyer's DefaultLocationScreen); flex:1 only resolves
        // correctly in the latter, since the former's parent has no
        // definite height for Yoga to distribute. A fixed cap works in
        // both, matching how CreateDealScreen's other in-modal scrollable
        // lists (e.g. storeAddressList) are already sized.
        style={{ maxHeight }}
        data={filtered}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {showCustomRow ? (
              <TouchableOpacity
                style={styles.row}
                onPress={() => onSelect(trimmedQuery)}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={[styles.rowText, styles.customRowText]}>
                  {`Use "${trimmedQuery}"`}
                </Text>
              </TouchableOpacity>
            ) : null}
            {showAllOption ? (
              <TouchableOpacity style={styles.row} onPress={() => onSelect(null)}>
                <Text style={styles.rowText}>{allOptionLabel}</Text>
                {!selectedCity ? (
                  <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                ) : null}
              </TouchableOpacity>
            ) : null}
          </>
        }
        renderItem={({ item }) => {
          const isSelected =
            !!selectedCity && item.toLowerCase() === selectedCity.toLowerCase();
          return (
            <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
              <Text style={styles.rowText}>{item}</Text>
              {isSelected ? (
                <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !showCustomRow ? (
            <Text style={styles.emptyText}>
              {cities.length ? "No matching cities." : "No cities yet."}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    wrap: {
      width: "100%",
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      color: theme.colors.text,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    rowText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    customRowText: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    emptyText: {
      textAlign: "center",
      color: theme.colors.textMuted,
      paddingVertical: 20,
      fontSize: 13,
    },
  });
