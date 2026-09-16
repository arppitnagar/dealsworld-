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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { db } from "../config/firebase";
import apiClient from "../api/client";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useTheme, ChatSkeleton, TopPageHeader, AppInput } from "@dealsworld/shared";

export default function DealChat({ route, navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const deal = route?.params?.deal;
  const dealId = deal?.id;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [isBuyerTyping, setIsBuyerTyping] = useState(false);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingSentRef = useRef(false);
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
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ref: docSnap.ref,
        ...docSnap.data(),
      }));

      // Only mark newly-added messages, not the whole list on every single
      // snapshot - re-scanning and re-writing every message on every change
      // is O(n) per event and was the real cause of chat getting slower
      // with every message sent, not a rendering issue.
      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const msg = change.doc.data();
        if (
          msg.senderRole === "buyer" &&
          (!msg.deliveredAtSeller || !msg.seenAtSeller)
        ) {
          updateDoc(change.doc.ref, {
            deliveredAtSeller: msg.deliveredAtSeller || serverTimestamp(),
            seenAtSeller: serverTimestamp(),
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
    // A group deal can have several buyers in its chat at once, each with
    // their own typing/buyer_{uid} doc - so this listens for "is any buyer
    // currently typing" across all of them, rather than one fixed doc.
    const buyerTypingQuery = query(
      collection(db, "deals", dealId, "typing"),
      where("role", "==", "buyer"),
    );
    const unsubscribe = onSnapshot(
      buyerTypingQuery,
      (snap) => {
        const anyBuyerTyping = snap.docs.some(
          (docSnap) => docSnap.data()?.isTyping,
        );
        setIsBuyerTyping(anyBuyerTyping);
      },
      (error) => console.warn("Buyer typing listener failed:", error),
    );
    return () => unsubscribe();
  }, [dealId]);

  useEffect(() => {
    if (!dealId) return;
    const typingRef = doc(db, "deals", dealId, "typing", "seller");

    if (text.trim().length > 0) {
      // Only write isTyping=true on the rising edge (first keystroke of a
      // burst) - writing on every single keystroke was hammering Firestore
      // and was the real cause of the multi-second UI freezes seen in
      // testing, not a rendering bug.
      if (!isTypingSentRef.current) {
        isTypingSentRef.current = true;
        setDoc(
          typingRef,
          { isTyping: true, role: "seller", updatedAt: serverTimestamp() },
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
          { isTyping: false, role: "seller", updatedAt: serverTimestamp() },
          { merge: true },
        ).catch((error) =>
          console.warn("Failed to set isTyping=false (timeout):", error),
        );
      }, 4000);
    } else if (isTypingSentRef.current) {
      isTypingSentRef.current = false;
      setDoc(
        typingRef,
        { isTyping: false, role: "seller", updatedAt: serverTimestamp() },
        { merge: true },
      ).catch((error) => console.warn("Failed to set isTyping=false:", error));
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [dealId, text]);

  // Separate from the per-keystroke effect above (which would otherwise
  // clear isTyping on every single keystroke's cleanup, not just when
  // actually leaving the screen) - this only fires on unmount, so leaving
  // chat mid-type doesn't leave a stale "typing..." indicator stuck on for
  // the other side forever.
  useEffect(() => {
    if (!dealId) return undefined;
    const typingRef = doc(db, "deals", dealId, "typing", "seller");
    return () => {
      setDoc(
        typingRef,
        { isTyping: false, role: "seller", updatedAt: serverTimestamp() },
        { merge: true },
      ).catch(() => {});
    };
  }, [dealId]);

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
    setDoc(
      doc(db, "deals", dealId, "typing", "seller"),
      { isTyping: false, role: "seller", updatedAt: serverTimestamp() },
      { merge: true },
    ).catch((error) => console.warn("Failed to clear isTyping on send:", error));

    try {
      await addDoc(collection(db, "deals", dealId, "messages"), {
        text: trimmed,
        createdAt: serverTimestamp(),
        senderRole: "seller",
        senderId: deal?.sellerId || "seller",
        senderName: "Seller",
      });
    } catch (error) {
      console.warn("Failed to send message:", error);
      setText(trimmed); // put it back so it isn't silently lost
      return;
    }

    // Push notification for the buyer(s) in this chat - best-effort, never
    // blocks sending the message itself if it fails.
    apiClient
      .post(`/deals/${dealId}/chat-notify`, { message: trimmed })
      .catch((error) => console.warn("chat-notify failed:", error?.message));
  };

  const renderItem = ({ item }) => {
    const isSeller = item.senderRole === "seller";
    const messageTime = formatTime(getMessageDate(item.createdAt));
    const statusLevel = isSeller
      ? getStatusLevel(item.deliveredAtBuyer, item.seenAtBuyer)
      : null;
    return (
      <View
        style={[
          styles.messageRow,
          isSeller ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isSeller ? styles.bubbleRight : styles.bubbleLeft,
          ]}
        >
          <Text style={styles.messageText}>{item.text}</Text>
          {messageTime ? (
            <Text style={styles.timeText}>{messageTime}</Text>
          ) : null}
          {statusLevel ? (
            <View style={styles.statusRow}>
              <StatusIndicator level={statusLevel} />
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <TopPageHeader
        title={deal?.title || "Deal Chat"}
        subtitle={deal?.category || "Deal"}
        onBack={() => navigation.goBack()}
        style={styles.header}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
      >
        {isBuyerTyping ? (
          <Text style={styles.headerTypingText}>Buyer is typing…</Text>
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
                <Text style={styles.emptyText}>
                  No messages yet. Start the conversation.
                </Text>
              </View>
            }
          />
        )}

        <View style={[styles.inputBar, { marginBottom: bottomInset }]}>
          <AppInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
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

function StatusIndicator({ level }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    fontWeight: "500",
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
    color: theme.colors.chatStatusDefault,
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
  headerTypingText: {
    fontSize: 10,
    color: theme.colors.chatHeaderSubtle,
    fontStyle: "italic",
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
});
