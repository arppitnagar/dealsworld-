import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppInput,
  ChatSkeleton,
  useTheme,
  TopPageHeader,
  useI18n,
  getCategoryLabel,
  goBackOrNavigate,
} from "@dealsworld/shared";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";
import {
  collection,
  addDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function DealChatScreen({ route, navigation }) {
  const { dealId, deal } = route.params || {};
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [isSellerTyping, setIsSellerTyping] = useState(false);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingSentRef = useRef(false);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const bottomInset =
    Platform.OS === "android"
      ? insets.bottom > 0
        ? insets.bottom
        : 0
      : insets.bottom;

  useEffect(() => {
    if (!dealId) return;
    const messagesRef = collection(db, "deals", dealId, "messages");
    // Most recent first + limit, then reversed below - an unbounded asc
    // query re-syncs the entire message history on every snapshot, which
    // only gets worse the longer a deal's chat thread lives.
    const q = query(messagesRef, orderBy("createdAt", "desc"), limit(200));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ref: docSnap.ref,
          ...docSnap.data(),
        }))
        .reverse();

      // Only mark newly-added messages, not the whole list on every single
      // snapshot - re-scanning and re-writing every message on every change
      // is O(n) per event and was the real cause of chat getting slower
      // with every message sent, not a rendering issue. (The seller-replied
      // notification that used to live here is now handled server-side by
      // the backend's /chat-notify endpoint - see apps/backend/src/routes
      // /chat.js - which also sends the real push notification, so doing it
      // here too was just producing a duplicate in-app notification.)
      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const msg = change.doc.data();
        if (
          msg.senderRole === "seller" &&
          (!msg.deliveredAtBuyer || !msg.seenAtBuyer)
        ) {
          updateDoc(change.doc.ref, {
            deliveredAtBuyer: msg.deliveredAtBuyer || serverTimestamp(),
            seenAtBuyer: serverTimestamp(),
          }).catch((error) =>
            console.warn("Failed to mark message seen:", error),
          );
        }
      });
      setMessages(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [dealId]);

  useEffect(() => {
    if (!dealId) return;
    const timeout = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timeout);
  }, [dealId]);

  useEffect(() => {
    if (!dealId) return;
    const sellerTypingRef = doc(db, "deals", dealId, "typing", "seller");
    const unsubscribe = onSnapshot(
      sellerTypingRef,
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        setIsSellerTyping(Boolean(data?.isTyping));
      },
      (error) => console.warn("Seller typing listener failed:", error),
    );
    return () => unsubscribe();
  }, [dealId]);

  useEffect(() => {
    if (!dealId || !user?.uid) return;
    // Each buyer gets their own typing doc (a deal's chat can have several
    // buyers in it at once) - a single shared "buyer" doc would let one
    // buyer stopping typing wipe out another buyer's still-active typing
    // state.
    const typingRef = doc(db, "deals", dealId, "typing", `buyer_${user.uid}`);

    if (text.trim().length > 0) {
      // Only write isTyping=true on the rising edge (first keystroke of a
      // burst) - writing on every single keystroke was hammering Firestore
      // and was the real cause of the multi-second UI freezes seen in
      // testing, not a rendering bug.
      if (!isTypingSentRef.current) {
        isTypingSentRef.current = true;
        setDoc(
          typingRef,
          { isTyping: true, role: "buyer", updatedAt: serverTimestamp() },
          { merge: true },
        ).catch((error) => console.warn("Failed to set isTyping=true:", error));
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        isTypingSentRef.current = false;
        setDoc(
          typingRef,
          { isTyping: false, role: "buyer", updatedAt: serverTimestamp() },
          { merge: true },
        ).catch((error) =>
          console.warn("Failed to set isTyping=false (timeout):", error),
        );
      }, 4000);
    } else if (isTypingSentRef.current) {
      isTypingSentRef.current = false;
      setDoc(
        typingRef,
        { isTyping: false, role: "buyer", updatedAt: serverTimestamp() },
        { merge: true },
      ).catch((error) => console.warn("Failed to set isTyping=false:", error));
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [dealId, text, user?.uid]);

  // Separate from the per-keystroke effect above (which would otherwise
  // clear isTyping on every single keystroke's cleanup, not just when
  // actually leaving the screen) - this only fires on unmount, so leaving
  // chat mid-type doesn't leave a stale "typing..." indicator stuck on for
  // the other side forever.
  useEffect(() => {
    if (!dealId || !user?.uid) return undefined;
    const typingRef = doc(db, "deals", dealId, "typing", `buyer_${user.uid}`);
    return () => {
      setDoc(
        typingRef,
        { isTyping: false, role: "buyer", updatedAt: serverTimestamp() },
        { merge: true },
      ).catch(() => {});
    };
  }, [dealId, user?.uid]);

  useEffect(() => {
    if (!listRef.current || messages.length === 0) return;
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 60);
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !dealId) return;
    setText("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingSentRef.current = false;

    // Clearing the typing flag is a nice-to-have, not worth losing the
    // actual message over if it fails for some reason.
    if (user?.uid) {
      setDoc(
        doc(db, "deals", dealId, "typing", `buyer_${user.uid}`),
        { isTyping: false, role: "buyer", updatedAt: serverTimestamp() },
        { merge: true },
      ).catch((error) =>
        console.warn("Failed to clear isTyping on send:", error),
      );
    }

    try {
      await addDoc(collection(db, "deals", dealId, "messages"), {
        text: trimmed,
        createdAt: serverTimestamp(),
        senderRole: "buyer",
        senderId: user?.uid || "buyer",
        senderName: "Buyer",
      });
    } catch (error) {
      console.warn("Failed to send message:", error);
      setText(trimmed); // put it back so it isn't silently lost
      return;
    }

    // Push notification for the seller (and any other joined buyers) -
    // best-effort, never blocks sending the message itself if it fails.
    apiClient
      .post(`/deals/${dealId}/chat-notify`, { message: trimmed })
      .catch((error) => console.warn("chat-notify failed:", error?.message));
  };

  const renderItem = ({ item }) => {
    const isBuyer = item.senderRole === "buyer";
    const messageTime = formatTime(getMessageDate(item.createdAt));
    const statusLevel = isBuyer
      ? getStatusLevel(item.deliveredAtSeller, item.seenAtSeller)
      : null;
    return (
      <View
        style={[
          styles.messageRow,
          isBuyer ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isBuyer ? styles.bubbleRight : styles.bubbleLeft,
          ]}
        >
          <Text style={styles.messageText}>{item.text}</Text>
          {messageTime ? (
            <Text style={styles.timeText}>{messageTime}</Text>
          ) : null}
          {statusLevel ? (
            <View style={styles.statusRow}>
            <StatusIndicator level={statusLevel} theme={theme} styles={styles} />
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <TopPageHeader
        title={deal?.title || t("chat.title")}
        subtitle={deal?.category ? getCategoryLabel(deal.category, t) : t("dealLayout.deal")}
        onBack={() => goBackOrNavigate(navigation)}
        style={styles.header}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
      >
        {isSellerTyping ? (
          <Text style={styles.headerTypingText}>{t("chat.sellerTyping")}</Text>
        ) : null}
      </TopPageHeader>

      <KeyboardAvoidingView
        style={styles.chatBody}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 84 : 0}
      >
        {loading ? (
          <ChatSkeleton />
        ) : (
          <FlatList
            ref={listRef}
            style={styles.messageList}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 12 + bottomInset + 16 },
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={32}
                  color={theme.colors.chatEmptyIcon}
                />
                <Text style={styles.emptyText}>{t("chat.empty")}</Text>
              </View>
            }
          />
        )}

        <View style={[styles.inputBar, { marginBottom: bottomInset }]}>
          <AppInput
            value={text}
            onChangeText={setText}
            placeholder={t("chat.placeholder")}
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color={theme.colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getMessageDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(date) {
  if (!date) return null;
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusLevel(deliveredAt, seenAt) {
  if (seenAt) return "seen";
  if (deliveredAt) return "delivered";
  return "sent";
}

function StatusIndicator({ level, theme, styles }) {
  const isSeen = level === "seen";
  const strokeColor = isSeen
    ? theme.colors.chatStatusSeen
    : theme.colors.chatStatusDefault;
  const fillColor = isSeen
    ? theme.colors.chatStatusSeen
    : theme.colors.chatStatusDefault;

  if (level === "sent") {
    return (
      <View style={styles.statusSingle}>
        <View style={[styles.statusCircle, { borderColor: strokeColor }]} />
      </View>
    );
  }
  if (level === "delivered") {
    return (
      <View style={styles.statusDouble}>
        <View style={[styles.statusCircle, { borderColor: strokeColor }]} />
        <View style={[styles.statusCircle, { borderColor: strokeColor }]} />
      </View>
    );
  }
  return (
    <View style={styles.statusSingle}>
      <View style={[styles.statusCircle, { borderColor: strokeColor }]}>
        <View style={[styles.statusDot, { backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.chatBg,
  },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: theme.colors.chatHeader,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 10,
    color: theme.colors.chatHeaderSubtle,
    marginTop: 1,
  },
  chatBody: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 36,
  },
  emptyText: {
    marginTop: 8,
    color: theme.colors.textMuted,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },
  messageRowLeft: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "100%",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bubbleRight: {
    backgroundColor: theme.colors.chatBubbleSent,
    borderTopRightRadius: 4,
  },
  bubbleLeft: {
    backgroundColor: theme.colors.chatBubbleReceived,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 19,
  },
  timeText: {
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 3,
    alignSelf: "flex-end",
  },
  statusRow: {
    marginTop: 2,
    alignSelf: "flex-end",
  },
  statusSingle: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDouble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.chatStatusDefault,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.chatStatusDefault,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.chatInputBg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputContainer: {
    marginTop: 0,
    flex: 1,
  },
  input: {
    height: 36,
    maxHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: theme.colors.chatBubbleReceived,
    color: theme.colors.text,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.chatSend,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTypingText: {
    fontSize: 10,
    color: theme.colors.chatHeaderSubtle,
    fontStyle: "italic",
  },
  });
