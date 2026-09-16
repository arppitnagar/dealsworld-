import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeProvider";
import AppInput from "./ui/AppInput";
import AppButton from "./ui/AppButton";

const getLabelFromFields = (fields, key) =>
  fields.find((field) => field.key === key)?.label || key;
const normalizeText = (value) => String(value || "").toLowerCase().trim();

const FIELD_PANEL_META = {
  title: { panelTitle: "Deal Title", quickTitle: "Suggested title filters" },
  price: { panelTitle: "Price and Deals", quickTitle: "Price" },
  location: { panelTitle: "Location", quickTitle: "Location filters" },
  vendor: { panelTitle: "Seller", quickTitle: "Seller filters" },
  category: { panelTitle: "Category", quickTitle: "Deal category" },
  deliveryMode: { panelTitle: "Delivery", quickTitle: "Delivery mode" },
  expiration: { panelTitle: "Expiration", quickTitle: "Expiry filters" },
  joinedUsers: { panelTitle: "Joined Users", quickTitle: "Joined range" },
  requiredUsers: {
    panelTitle: "Required Users",
    quickTitle: "Minimum required range",
  },
  status: { panelTitle: "Status", quickTitle: "Deal status" },
};

const FIELD_VALUE_PRESETS = {
  status: [
    { label: "Active", value: "active", mode: "equals" },
    { label: "Pending", value: "pending", mode: "equals" },
    { label: "New", value: "new", mode: "equals" },
    { label: "Hot", value: "hot", mode: "equals" },
    { label: "Viewed", value: "viewed", mode: "equals" },
    { label: "Liked", value: "favourite", mode: "equals" },
    { label: "Joined", value: "joined", mode: "equals" },
  ],
  deliveryMode: [
    { label: "Free Home Delivery", value: "free home delivery", mode: "equals" },
    { label: "Paid Home Delivery", value: "paid home delivery", mode: "equals" },
    { label: "Pick from Store", value: "pick from store", mode: "equals" },
  ],
  category: [
    { label: "Food", value: "food", mode: "equals" },
    { label: "Fashion", value: "fashion", mode: "equals" },
    { label: "Electronics", value: "electronics", mode: "equals" },
    { label: "Entertainment", value: "entertainment", mode: "equals" },
    { label: "Travel", value: "travel", mode: "equals" },
  ],
  price: [
    { label: "Any Price", value: "", mode: "equals" },
    { label: "Up to 300", value: "<=300", mode: "equals" },
    { label: "300 - 500", value: "300-500", mode: "equals" },
    { label: "500 - 800", value: "500-800", mode: "equals" },
    { label: "800 - 1100", value: "800-1100", mode: "equals" },
    { label: "Over 1100", value: "1100+", mode: "equals" },
  ],
  joinedUsers: [
    { label: "0 - 2", value: "0-2", mode: "equals" },
    { label: "3 - 5", value: "3-5", mode: "equals" },
    { label: "6 - 10", value: "6-10", mode: "equals" },
    { label: "11+", value: "11+", mode: "equals" },
  ],
  requiredUsers: [
    { label: "1 - 5", value: "1-5", mode: "equals" },
    { label: "6 - 10", value: "6-10", mode: "equals" },
    { label: "11 - 20", value: "11-20", mode: "equals" },
    { label: "20+", value: "20+", mode: "equals" },
  ],
};

const getFieldPlaceholder = (fieldKey) => {
  switch (fieldKey) {
    case "price":
      return "Example: <=300, 300-500, 1100+";
    case "expiration":
      return "Enter date/timestamp";
    case "joinedUsers":
      return "Example: 0-5 or >=10";
    case "requiredUsers":
      return "Example: 5-10 or 20+";
    case "status":
      return "Choose or type status";
    case "deliveryMode":
      return "Choose or type delivery mode";
    default:
      return "Enter filter value";
  }
};

export function DealSortModal({
  visible,
  onClose,
  fields = [],
  selectedField,
  onSelectField,
  sortOrder = "asc",
  onSortOrderChange,
  onClear,
  title = "Sort Deals",
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const canClearSort = Boolean(selectedField);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDeep]}
            style={styles.sortHeaderGradient}
          >
            <View style={styles.sortHeaderRow}>
              <Text style={styles.sortHeaderTitle}>{title}</Text>
              <TouchableOpacity
                style={styles.sortCloseIconButton}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.onPrimary}
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          <View style={styles.sortContent}>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[
                  styles.modeChip,
                  sortOrder === "asc" && styles.modeChipActive,
                ]}
                onPress={() => onSortOrderChange?.("asc")}
                accessibilityRole="button"
                accessibilityLabel="Ascending sort"
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={
                    sortOrder === "asc"
                      ? theme.colors.primary
                      : theme.colors.textMuted
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeChip,
                  sortOrder === "desc" && styles.modeChipActive,
                ]}
                onPress={() => onSortOrderChange?.("desc")}
                accessibilityRole="button"
                accessibilityLabel="Descending sort"
              >
                <Ionicons
                  name="arrow-down"
                  size={18}
                  color={
                    sortOrder === "desc"
                      ? theme.colors.primary
                      : theme.colors.textMuted
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.sortContent}>
            <Text style={styles.sortSectionTitle}>Sort by</Text>
          </View>
          <View style={styles.fieldList}>
            {fields.map((field) => (
              <TouchableOpacity
                key={field.key}
                style={[
                  styles.fieldRow,
                  selectedField === field.key && styles.fieldRowActive,
                ]}
                onPress={() => onSelectField?.(field.key)}
              >
                <Text
                  style={[
                    styles.fieldText,
                    selectedField === field.key && styles.fieldTextActive,
                  ]}
                >
                  {field.label}
                </Text>
                {selectedField === field.key ? (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={theme.colors.primary}
                  />
              ) : null}
            </TouchableOpacity>
          ))}
          </View>
          <View style={[styles.sortContent, styles.footerRow]}>
            <AppButton
              title="Clear sort"
              onPress={onClear}
              variant="secondary"
              disabled={!canClearSort}
              style={styles.clearButton}
              textStyle={[
                styles.clearText,
                !canClearSort && styles.clearTextDisabled,
              ]}
            />
            <AppButton
              title="Done"
              onPress={onClose}
              style={styles.applyButton}
              textStyle={styles.applyText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function DealFilterModal({
  visible,
  onClose,
  fields = [],
  selectedField,
  onSelectField,
  filterQuery = "",
  onFilterQueryChange,
  canAddRule = false,
  onAddRule,
  rules = [],
  onRemoveRule,
  onClearAll,
  onApply,
  resultCount,
  title = "Filter Deals",
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selectedFieldLabel = selectedField
    ? getLabelFromFields(fields, selectedField)
    : "Select a field";
  const panelMeta = selectedField
    ? FIELD_PANEL_META[selectedField] || null
    : null;
  const panelTitle = panelMeta?.panelTitle || selectedFieldLabel;
  const quickTitle = panelMeta?.quickTitle || "Quick options";
  const presetValues = selectedField
    ? FIELD_VALUE_PRESETS[selectedField] || []
    : [];

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.filterSheet}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDeep]}
            style={styles.sortHeaderGradient}
          >
            <View style={styles.sortHeaderRow}>
              <Text style={styles.sortHeaderTitle}>
                {title === "Filter Deals" ? "Filters" : title}
              </Text>
              <TouchableOpacity
                style={styles.sortCloseIconButton}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.onPrimary}
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.twoPanelWrap}>
            <View style={styles.leftPanel}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.leftPanelList}
              >
                {fields.map((field) => (
                  <TouchableOpacity
                    key={field.key}
                    style={[
                      styles.leftFieldItem,
                      selectedField === field.key && styles.leftFieldItemActive,
                    ]}
                    onPress={() => onSelectField?.(field.key)}
                  >
                    <View
                      style={[
                        styles.leftFieldIndicator,
                        selectedField === field.key &&
                          styles.leftFieldIndicatorActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.leftFieldText,
                        selectedField === field.key && styles.leftFieldTextActive,
                      ]}
                    >
                      {field.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.rightPanel}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.rightPanelScrollContent}
              >
                <View style={styles.rightTopRow}>
                  <Text style={styles.rightPanelTitle}>{panelTitle}</Text>
                  <TouchableOpacity onPress={onClearAll}>
                    <Text style={styles.filterClearAllText}>Clear all</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.rightPanelSubtitle}>
                  Select filter criteria
                </Text>

                {presetValues.length ? (
                  <View style={styles.criteriaBlock}>
                    <Text style={styles.criteriaTitle}>{quickTitle}</Text>
                    <View style={styles.presetWrap}>
                    {presetValues.map((option) => {
                      const value = option?.value ?? "";
                      const label = option?.label ?? String(value);
                      const selected =
                        normalizeText(filterQuery) === normalizeText(value);
                      return (
                        <TouchableOpacity
                          key={`${selectedField}_${label}_${value}`}
                          style={[
                            styles.presetChip,
                            selected && styles.presetChipActive,
                          ]}
                          onPress={() => onFilterQueryChange?.(value)}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              selected && styles.presetChipTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    </View>
                  </View>
                ) : null}

                <Text style={styles.criteriaTitle}>Custom value</Text>
                <AppInput
                  value={filterQuery}
                  onChangeText={onFilterQueryChange}
                  placeholder={
                    selectedField
                      ? getFieldPlaceholder(selectedField)
                      : "Choose a field first"
                  }
                  editable={Boolean(selectedField)}
                  containerStyle={styles.filterInputContainer}
                  inputStyle={styles.filterInput}
                  placeholderTextColor={theme.colors.textMuted}
                />

                <AppButton
                  title="Add Filter"
                  onPress={onAddRule}
                  disabled={!canAddRule}
                  style={styles.amazonAddButton}
                />

                <Text style={styles.sectionTitle}>Active filters</Text>
                <View style={styles.activeRuleList}>
                  {rules.length === 0 ? (
                    <Text style={styles.emptyRulesText}>No filters added yet.</Text>
                  ) : (
                    rules.map((rule) => (
                      <View key={rule.id} style={styles.activeRulePill}>
                        <Text style={styles.activeRulePillText}>
                          {getLabelFromFields(fields, rule.field)}: {rule.query}
                        </Text>
                        <TouchableOpacity onPress={() => onRemoveRule?.(rule.id)}>
                          <Ionicons
                            name="close"
                            size={16}
                            color={theme.colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          </View>

          <View style={styles.amazonBottomBar}>
            <AppButton
              title={
                typeof resultCount === "number"
                  ? `Show ${resultCount} results`
                  : "Show results"
              }
              onPress={onApply}
              style={styles.amazonResultButton}
              textStyle={styles.amazonResultButtonText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlay,
    },

    // Sort modal
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
      maxHeight: "86%",
      overflow: "hidden",
    },
    sortHeaderGradient: {
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    sortHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    sortHeaderTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    sortCloseIconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.onPrimarySoft,
      borderWidth: 1,
      borderColor: theme.colors.onPrimaryMuted,
    },
    sortContent: {
      paddingHorizontal: 18,
    },
    sortSectionTitle: {
      marginTop: -2,
      marginBottom: -4,
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    modeRow: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "flex-start",
    },
    modeChip: {
      width: 48,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    modeChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.infoSoft,
    },
    modeText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    modeTextActive: {
      color: theme.colors.primary,
    },
    fieldList: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      overflow: "hidden",
      marginHorizontal: 18,
    },
    fieldRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    fieldRowActive: {
      backgroundColor: theme.colors.infoSoft,
    },
    fieldText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
    },
    fieldTextActive: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 2,
    },
    clearButton: {
      flex: 1,
      borderRadius: 12,
      minHeight: 44,
      shadowOpacity: 0,
      elevation: 0,
    },
    clearText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    clearTextDisabled: {
      color: theme.colors.textMuted,
    },
    applyButton: {
      flex: 1,
      borderRadius: 12,
      minHeight: 44,
      shadowOpacity: 0,
      elevation: 0,
    },
    applyText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    buttonDisabled: {
      opacity: 0.5,
    },

    // Filter modal (Amazon-like two panel)
    filterSheet: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      paddingTop: 0,
      paddingBottom: 0,
      gap: 0,
      overflow: "hidden",
    },
    amazonHeaderRow: {
      height: 64,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    amazonHeaderTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.colors.text,
    },
    closeIconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    twoPanelWrap: {
      flexDirection: "row",
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    leftPanel: {
      width: "35%",
      backgroundColor: theme.colors.surfaceMuted,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
    },
    leftPanelList: {
      paddingVertical: 0,
    },
    leftFieldItem: {
      minHeight: 56,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      flexDirection: "row",
      alignItems: "center",
    },
    leftFieldItemActive: {
      backgroundColor: theme.colors.surface,
    },
    leftFieldIndicator: {
      width: 4,
      backgroundColor: "transparent",
    },
    leftFieldIndicatorActive: {
      backgroundColor: theme.colors.primary,
    },
    leftFieldText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textMuted,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    leftFieldTextActive: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    rightPanel: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 12,
    },
    rightPanelScrollContent: {
      gap: 10,
      paddingBottom: 16,
    },
    rightTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    rightPanelTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
    },
    rightPanelSubtitle: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
      marginTop: -2,
    },
    filterClearAllText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    criteriaBlock: {
      gap: 10,
    },
    criteriaTitle: {
      marginTop: 2,
      marginBottom: -2,
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    sectionTitle: {
      marginTop: 4,
      marginBottom: -2,
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    presetWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    presetChip: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minWidth: 110,
    },
    presetChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.infoSoft,
    },
    presetChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.text,
    },
    presetChipTextActive: {
      color: theme.colors.primary,
    },
    filterInputContainer: {
      marginTop: 0,
    },
    filterInput: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.text,
    },
    amazonAddButton: {
      borderRadius: 12,
      minHeight: 46,
      shadowOpacity: 0,
      elevation: 0,
    },
    activeRuleList: {
      maxHeight: 130,
      gap: 8,
    },
    emptyRulesText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      paddingHorizontal: 2,
      paddingVertical: 6,
    },
    activeRulePill: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    activeRulePillText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.text,
      fontWeight: "600",
    },
    amazonBottomBar: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    amazonResultButton: {
      minHeight: 52,
      borderRadius: 26,
      shadowOpacity: 0,
      elevation: 0,
    },
    amazonResultButtonText: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
  });
