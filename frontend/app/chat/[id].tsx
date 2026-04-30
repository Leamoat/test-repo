import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, formatErr } from "../../src/api";
import { useAuth } from "../../src/auth";
import { C, R } from "../../src/theme";

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/conversations/${id}`);
      setData(r.data);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    } catch {}
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  if (!data || !user) return <View style={styles.center}><ActivityIndicator color={C.accent} /></View>;
  const { conversation, messages, delivery } = data;
  const otherId = conversation.participants.find((p: string) => p !== user.id);
  const otherName = conversation.participant_names?.[otherId] ?? "User";
  const isOwner = conversation.owner_id === user.id;

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post(`/conversations/${id}/messages`, { text: text.trim() });
      setText("");
      load();
    } catch (e) { Alert.alert("Error", formatErr(e)); } finally { setSending(false); }
  };

  const accept = async () => {
    try { await api.post(`/conversations/${id}/accept-offer`); load(); } catch (e) { Alert.alert("Error", formatErr(e)); }
  };
  const reject = async () => {
    try { await api.post(`/conversations/${id}/reject-offer`); load(); } catch (e) { Alert.alert("Error", formatErr(e)); }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="chat-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="chat-back" style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={26} color={C.primary} />
        </TouchableOpacity>
        <View style={styles.avatar}><Text style={styles.avatarTxt}>{otherName[0]}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{otherName}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{conversation.listing_title}</Text>
        </View>
      </View>

      {conversation.offer_status === "pending" && isOwner ? (
        <View style={styles.offerBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.offerLabel}>PENDING OFFER</Text>
            <Text style={styles.offerPrice}>€{conversation.current_offer}</Text>
          </View>
          <TouchableOpacity testID="reject-offer-btn" style={[styles.offerBtn, { backgroundColor: "#fff", borderWidth: 1, borderColor: C.border }]} onPress={reject}>
            <Text style={{ color: C.text, fontWeight: "700" }}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="accept-offer-btn" style={[styles.offerBtn, { backgroundColor: C.success }]} onPress={accept}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {delivery && delivery.status === "in_transit" ? (
        <TouchableOpacity
          testID="delivery-banner"
          style={styles.deliveryBar}
          onPress={() => router.push(`/validate/${delivery.id}`)}
        >
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", flex: 1, marginLeft: 8 }}>
            {user.id === delivery.sender_id ? "Show validation code to traveler" : "Enter validation code on arrival"}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      ) : null}

      {delivery && delivery.status === "delivered" ? (
        <TouchableOpacity testID="review-banner" style={[styles.deliveryBar, { backgroundColor: C.primary }]} onPress={() => router.push(`/review/${delivery.id}`)}>
          <Ionicons name="star" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", flex: 1, marginLeft: 8 }}>Delivery completed — leave a review</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <FlatList
          ref={listRef}
          testID="messages-list"
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = item.sender_id === user.id;
            const sys = item.type === "system";
            if (sys) {
              return (
                <View style={styles.sysWrap}>
                  <Text style={styles.sysTxt}>{item.text}</Text>
                </View>
              );
            }
            return (
              <View style={[styles.bubbleRow, mine && { justifyContent: "flex-end" }]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, item.type === "offer" && styles.bubbleOffer]}>
                  {item.type === "offer" ? (
                    <View>
                      <Text style={[styles.offerTag, { color: mine ? "#fff" : C.accent }]}>OFFER</Text>
                      <Text style={[styles.offerVal, { color: mine ? "#fff" : C.primary }]}>€{item.offer_price}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.bubbleTxt, mine && { color: "#fff" }]}>{item.text}</Text>
                </View>
              </View>
            );
          }}
        />
        <View style={styles.inputBar}>
          <TextInput
            testID="chat-input"
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Write a message…"
            placeholderTextColor="#9CA3AF"
            multiline
          />
          <TouchableOpacity testID="chat-send-btn" style={styles.sendBtn} onPress={send} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "#fff" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontWeight: "700" },
  headerName: { fontSize: 16, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 12, color: C.primary, fontWeight: "600" },
  offerBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#FFF8F2", borderBottomWidth: 1, borderBottomColor: "#FFD9B8" },
  offerLabel: { fontSize: 10, color: C.textMuted, fontWeight: "700", letterSpacing: 0.5 },
  offerPrice: { fontSize: 18, fontWeight: "800", color: C.accent },
  offerBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: R },
  deliveryBar: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: C.accent },
  bubbleRow: { flexDirection: "row", marginBottom: 8 },
  bubble: { maxWidth: "78%", padding: 12, borderRadius: 16 },
  bubbleMine: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleOffer: { borderColor: C.accent, borderWidth: 1 },
  bubbleTxt: { color: C.text, fontSize: 14, lineHeight: 19 },
  offerTag: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, marginBottom: 2 },
  offerVal: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  sysWrap: { alignItems: "center", marginVertical: 8 },
  sysTxt: { fontSize: 12, color: C.textMuted, backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 8, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.border },
  input: { flex: 1, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: C.text, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
});
