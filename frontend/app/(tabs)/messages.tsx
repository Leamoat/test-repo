import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { C, R } from "../../src/theme";

export default function Messages() {
  const router = useRouter();
  const { user } = useAuth();
  const [convos, setConvos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/conversations");
      setConvos(r.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="messages-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.sub}>Your active conversations.</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.accent} /></View>
      ) : convos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={64} color={C.border} />
          <Text style={styles.empty}>No conversations yet</Text>
          <Text style={styles.emptySub}>Make an offer on a listing to start chatting.</Text>
        </View>
      ) : (
        <FlatList
          testID="conversations-list"
          data={convos}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
          renderItem={({ item }) => {
            const otherId = item.participants.find((p: string) => p !== user?.id);
            const otherName = item.participant_names?.[otherId] ?? "User";
            return (
              <TouchableOpacity testID={`conversation-${item.id}`} style={styles.row} onPress={() => router.push(`/chat/${item.id}`)}>
                <View style={styles.avatar}><Text style={styles.avatarTxt}>{otherName[0]}</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.name}>{otherName}</Text>
                    <StatusPill status={item.offer_status} />
                  </View>
                  <Text style={styles.listing} numberOfLines={1}>{item.listing_title}</Text>
                  <Text style={styles.last} numberOfLines={1}>{item.last_message}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "#FFF1E5", color: C.accent, label: "Pending" },
    accepted: { bg: "#D1FAE5", color: C.success, label: "Accepted" },
    rejected: { bg: "#FEE2E2", color: C.error, label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Text style={{ color: s.color, fontSize: 10, fontWeight: "800" }}>{s.label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: "800", color: C.primary },
  sub: { color: C.textMuted, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  empty: { color: C.text, fontSize: 16, fontWeight: "700", marginTop: 16 },
  emptySub: { color: C.textMuted, fontSize: 13, marginTop: 4, textAlign: "center" },
  row: { backgroundColor: C.surface, borderRadius: R, padding: 14, marginBottom: 10, flexDirection: "row", gap: 12, borderWidth: 1, borderColor: C.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontSize: 18, fontWeight: "700" },
  name: { fontSize: 15, fontWeight: "700", color: C.text },
  listing: { fontSize: 12, color: C.primary, fontWeight: "600", marginTop: 2 },
  last: { fontSize: 13, color: C.textMuted, marginTop: 4 },
});
