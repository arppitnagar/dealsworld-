import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../config/firebase";
import {
  collection,
  addDoc,
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
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isSellerTyping, setIsSellerTyping] = useState(false);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const insets = useSafeAreaInsets();

  const topInset =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : insets.top;
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

      list.forEach((msg) => {
        if (msg.senderRole === "seller") {
          if (!msg.deliveredAtBuyer || !msg.seenAtBuyer) {
            updateDoc(msg.ref, {
              deliveredAtBuyer: msg.deliveredAtBuyer || serverTimestamp(),
              seenAtBuyer: serverTimestamp(),
            });
          }
        }
      });
      setMessages(list);
    });
    return () => unsubscribe();
  }, [dealId]);

  useEffect(() => {
    if (!dealId) return;
    const sellerTypingRef = doc(db, "deals", dealId, "typing", "seller");
    const unsubscribe = onSnapshot(sellerTypingRef, (snap) => {
      const data = snap.exists() ? snap.data() : {};
      setIsSellerTyping(Boolean(data?.isTyping));
    });
    return () => unsubscribe();
  }, [dealId]);

  useEffect(() => {
    if (!dealId) return;
    const typingRef = doc(db, "deals", dealId, "typing", "buyer");

    if (text.trim().length > 0) {
      setDoc(
        typingRef,
        { isTyping: true, updatedAt: serverTimestamp() },
        { merge: true },
      );

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setDoc(
          typingRef,
          { isTyping: false, updatedAt: serverTimestamp() },
          { merge: true },
        );
      }, 1500);
    } else {
      setDoc(
        typingRef,
        { isTyping: false, updatedAt: serverTimestamp() },
        { merge: true },
      );
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [dealId, text]);

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
    await setDoc(
      doc(db, "deals", dealId, "typing", "buyer"),
      { isTyping: false, updatedAt: serverTimestamp() },
      { merge: true },
    );
    await addDoc(collection(db, "deals", dealId, "messages"), {
      text: trimmed,
      createdAt: serverTimestamp(),
      senderRole: "buyer",
      senderId: "buyer",
      senderName: "Buyer",
    });
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
              <StatusIndicator level={statusLevel} />
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <View style={[styles.headerSpacer, { height: topInset }]} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {deal?.title || "Deal Chat"}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {deal?.category || "Deal"}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatBody}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 84 : 0}
      >
        <FlatList
          ref={listRef}
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
                color="#CBD5E1"
              />
              <Text style={styles.emptyText}>
                No messages yet. Start the conversation.
              </Text>
            </View>
          }
        />

        {isSellerTyping && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>Seller is typing…</Text>
          </View>
        )}

        <View style={[styles.inputBar, { marginBottom: bottomInset }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message"
            placeholderTextColor="#94A3B8"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
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
  const isSeen = level === "seen";
  const strokeColor = isSeen ? "#34B7F1" : "#6B7280";
  const fillColor = isSeen ? "#34B7F1" : "#6B7280";

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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ECE5DD",
  },
  headerSpacer: {
    width: "100%",
    backgroundColor: "#075E54",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 52,
    backgroundColor: "#075E54",
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
  chatBody: {
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
    color: "#94A3B8",
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
    backgroundColor: "#DCF8C6",
    borderTopRightRadius: 4,
  },
  bubbleLeft: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  messageText: {
    fontSize: 13,
    color: "#111827",
  },
  timeText: {
    fontSize: 9,
    color: "#6B7280",
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
    borderColor: "#6B7280",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#6B7280",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: 10,
    backgroundColor: "#F0F2F5",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    height: 36,
    maxHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  typingRow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ECE5DD",
  },
  typingText: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
  },
});
