import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  EmptyState,
  toDate,
  useTheme,
  TopPageHeader,
  IconActionBar,
  ConfirmModal,
  useConfirmModal,
  useI18n,
} from "@dealsworld/shared";
import { useNotifications } from "../hooks/useNotifications";

export default function NotificationsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    notifications,
    loading,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
  } = useNotifications();
  const [clearing, setClearing] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { confirm, confirmModalProps } = useConfirmModal();
  const { language, t } = useI18n();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpen = async (item) => {
    if (!item) return;
    if (item.id && (!item.readAt || !item.isRead)) {
      await markNotificationRead(item.id);
    }
    if (item.dealId) {
      navigation.navigate("DealDetails", { dealId: item.dealId });
    }
  };

  const handleClearAll = async () => {
    if (clearing || unreadCount === 0) return;
    setClearing(true);
    try {
      await markAllNotificationsRead();
    } finally {
      setClearing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id || deletingId) return;
    const ok = await confirm({
      title: t("notifications.deleteOne"),
      confirmText: t("common.delete"),
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteNotification(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (deletingAll || notifications.length === 0) return;
    const ok = await confirm({
      title: t("notifications.deleteAllTitle"),
      message: t("notifications.deleteAllMessage"),
      confirmText: t("notifications.deleteAllConfirm"),
      destructive: true,
    });
    if (!ok) return;
    setDeletingAll(true);
    try {
      await deleteAllNotifications();
    } finally {
      setDeletingAll(false);
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.readAt && !item.isRead;
    const timeLabel = formatNotificationTime(item.createdAt, language);
    const title =
      item.title ||
      (item.type === "chat"
        ? t("notifications.sellerReplied")
        : item.type === "deal"
          ? t("notifications.newDeal")
          : t("notifications.fallbackTitle"));
    const body = item.body || item.message || item.preview || "";
    const iconName = item.type === "chat" ? "chatbubble-outline" : "pricetag";

    return (
      <TouchableOpacity
        style={[styles.noticeCard, isUnread && styles.noticeCardUnread]}
        onPress={() => handleOpen(item)}
        activeOpacity={0.8}
      >
        <View style={styles.noticeIcon}>
          <Ionicons name={iconName} size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.noticeContent}>
          <Text
            style={[styles.noticeTitle, isUnread && styles.noticeTitleUnread]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {body ? (
            <Text style={styles.noticeBody} numberOfLines={2}>
              {body}
            </Text>
          ) : null}
          {timeLabel ? (
            <Text style={styles.noticeTime}>{timeLabel}</Text>
          ) : null}
        </View>
        <View style={styles.noticeTrailing}>
          {isUnread ? <View style={styles.unreadDot} /> : null}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
            disabled={deletingId === item.id}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="trash-outline"
              size={15}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader title={t("notifications.title")} onBack={() => navigation.goBack()} rounded />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          notifications.length === 0
            ? styles.listContentEmpty
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="notifications-outline"
                title={t("notifications.emptyTitle")}
                subtitle={t("notifications.emptySubtitle")}
              />
            </View>
          )
        }
      />

      <IconActionBar
        items={[
          {
            key: "home",
            onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
            label: t("tabs.home"),
            icon: (color) => (
              <Ionicons name="home-outline" size={20} color={color} />
            ),
          },
          unreadCount > 0 && {
            key: "mark-all-read",
            onPress: handleClearAll,
            disabled: clearing,
            label: t("notifications.markAllRead"),
            icon: (color) => (
              <Ionicons name="checkmark-done-outline" size={20} color={color} />
            ),
          },
          notifications.length > 0 && {
            key: "delete-all",
            onPress: handleDeleteAll,
            disabled: deletingAll,
            label: t("notifications.deleteAll"),
            icon: (color) => (
              <Ionicons name="trash-outline" size={20} color={color} />
            ),
          },
        ]}
      />

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

function formatNotificationTime(value, language = "en") {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(`${language}-IN`, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.dashboardBg,
    },
    listContent: {
      padding: 20,
      paddingBottom: 24,
      gap: 12,
    },
    listContentEmpty: {
      flexGrow: 1,
      padding: 20,
    },
    noticeCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      ...theme.shadow.card,
    },
    noticeCardUnread: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.infoSoft,
    },
    noticeIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    noticeContent: {
      flex: 1,
      gap: 4,
    },
    noticeTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.text,
    },
    noticeTitleUnread: {
      color: theme.colors.primary,
    },
    noticeBody: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    noticeTime: {
      fontSize: 10,
      color: theme.colors.textMuted,
    },
    noticeTrailing: {
      alignItems: "center",
      gap: 10,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.danger,
      marginTop: 6,
    },
    deleteButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
    },
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingBottom: 80,
    },
  });
