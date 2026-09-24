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
import {
  AppButton,
  EmptyState,
  useTheme,
  TopPageHeader,
  ConfirmModal,
  useConfirmModal,
  useI18n,
} from "@dealsworld/shared";
import { getAddressLabel } from "../utils/addressLabels";
import { useAddresses } from "../hooks/useAddresses";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getProfileBaseStyles } from "../styles/profileStyles";

export default function AddressBookScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { addresses, loading, removeAddress, setDefaultAddress } =
    useAddresses();
  const { confirm, confirmModalProps } = useConfirmModal();
  const { t } = useI18n();

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: t("addresses.deleteTitle"),
      message: t("addresses.deleteMessage"),
      confirmText: t("common.delete"),
      destructive: true,
    });
    if (!ok) return;
    removeAddress(item.id);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.addressCard}
      onPress={() => navigation.navigate("AddressForm", { address: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{getAddressLabel(item.label, t)}</Text>
          </View>
          {item.isDefault ? (
            <View style={styles.defaultTag}>
              <Ionicons name="star" size={12} color={theme.colors.warningBright} />
              <Text style={styles.defaultTagText}>{t("addresses.default")}</Text>
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
      <TopPageHeader
        title={t("addresses.title")}
        onBack={() => navigation.goBack()}
        rounded
      />
      <View style={styles.heroCard}>
        <View style={styles.heroAccent} />
        <Text style={styles.heroTitle}>{t("addresses.heroTitle")}</Text>
        <Text style={styles.heroSubtitle}>{t("addresses.heroSubtitle")}</Text>
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
            title={t("addresses.emptyTitle")}
            subtitle={t("addresses.emptySubtitle")}
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
        title={t("addresses.addNew")}
        onPress={() => navigation.navigate("AddressForm")}
        style={[
          styles.addButton,
          { marginBottom: Math.max(insets.bottom, 12) },
        ]}
      />

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

function formatCityLine(city, state, pincode) {
  const parts = [city, state, pincode].filter(Boolean);
  return parts.join(", ");
}

const createStyles = (theme) => {
  const base = getProfileBaseStyles(theme);
  return StyleSheet.create({
    ...base,
    heroCard: {
      ...base.heroCard,
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 8,
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
};
