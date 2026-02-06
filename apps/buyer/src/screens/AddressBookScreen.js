import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, EmptyState, useTheme } from "@dealsworld/shared";
import { useAddresses } from "../hooks/useAddresses";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddressBookScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { addresses, loading, removeAddress, setDefaultAddress } =
    useAddresses();

  const handleDelete = (item) => {
    Alert.alert("Delete address", "Remove this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeAddress(item.id),
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.addressCard}
      onPress={() => navigation.navigate("AddressForm", { address: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.label || "Address"}</Text>
          </View>
          {item.isDefault ? (
            <View style={styles.defaultTag}>
              <Ionicons name="star" size={12} color={theme.colors.warningBright} />
              <Text style={styles.defaultTagText}>Default</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => setDefaultAddress(item.id)}
            style={styles.actionIcon}
          >
            <Ionicons
              name={item.isDefault ? "star" : "star-outline"}
              size={18}
              color={
                item.isDefault
                  ? theme.colors.warningBright
                  : theme.colors.textMuted
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={styles.actionIcon}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={theme.colors.danger}
            />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.addressLine}>{item.name || ""}</Text>
      <Text style={styles.addressLine}>{item.line1 || ""}</Text>
      {item.line2 ? (
        <Text style={styles.addressLine}>{item.line2}</Text>
      ) : null}
      <Text style={styles.addressLine}>
        {formatCityLine(item.city, item.state, item.pincode)}
      </Text>
      {item.phone ? (
        <Text style={styles.addressPhone}>{item.phone}</Text>
      ) : null}
    </TouchableOpacity>
  );

  const headerContent = (
    <View>
      <View
        style={[
          styles.headerBar,
          { paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={theme.colors.onPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Addresses</Text>
      </View>
      <View style={styles.heroCard}>
        <View style={styles.heroAccent} />
        <Text style={styles.heroTitle}>Manage your addresses</Text>
        <Text style={styles.heroSubtitle}>
          Add delivery locations for faster checkout.
        </Text>
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        { paddingBottom: Math.max(insets.bottom, 20) },
      ]}
    >
      {headerContent}

      {addresses.length === 0 && !loading ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="location-outline"
            title="No saved addresses"
            subtitle="Add one to speed up delivery."
          />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(80, insets.bottom + 80) },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AppButton
        title="Add New Address"
        onPress={() => navigation.navigate("AddressForm")}
        style={[
          styles.addButton,
          { marginBottom: Math.max(insets.bottom, 12) },
        ]}
      />
    </View>
  );
}

function formatCityLine(city, state, pincode) {
  const parts = [city, state, pincode].filter(Boolean);
  return parts.join(", ");
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.dashboardBg,
    },
    headerBar: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.onPrimarySoft,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.onPrimarySoft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 0,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    heroCard: {
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: 24,
      padding: 18,
      overflow: "hidden",
      ...theme.shadow.card,
    },
    heroAccent: {
      width: 56,
      height: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.onPrimary,
      opacity: 0.7,
      marginBottom: 10,
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    heroSubtitle: {
      fontSize: 12,
      marginTop: 6,
      color: theme.colors.onPrimaryMuted,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 80,
      gap: 12,
    },
    addressCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.infoSoft,
    },
    tagText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    defaultTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.amberSoft,
      borderWidth: 1,
      borderColor: theme.colors.amberBorder,
    },
    defaultTagText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.amberText,
      textTransform: "uppercase",
    },
    cardActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    actionIcon: {
      width: 30,
      height: 30,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    addressLine: {
      fontSize: 12,
      color: theme.colors.text,
      marginBottom: 2,
    },
    addressPhone: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      paddingBottom: 80,
    },
    addButton: {
      marginTop: 12,
    },
  });
