import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { C, R } from "../../src/theme";

export default function Profile() {
  const router = useRouter();
  const { user, signOut, refresh } = useAuth();
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      await refresh();
      const r = await api.get("/listings", { params: { user_id: user.id, status: "" } });
      setMyListings(r.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [user, refresh]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const logout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => { await signOut(); router.replace("/(auth)/welcome"); } },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="profile-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
      >
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{user.full_name[0]}</Text></View>
          <Text style={styles.name} testID="profile-name">{user.full_name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badge}>
            <Ionicons name={user.user_type === "traveler" ? "airplane" : user.user_type === "pro" ? "ribbon" : "cube"} size={12} color={C.accent} />
            <Text style={styles.badgeTxt}>{user.user_type.toUpperCase()}</Text>
          </View>
          <View style={styles.statRow}>
            <Stat icon="star" label="Rating" value={user.rating?.toFixed(1) || "—"} />
            <View style={styles.divider} />
            <Stat icon="document-text" label="Reviews" value={String(user.review_count || 0)} />
            <View style={styles.divider} />
            <Stat icon="cube" label="Listings" value={String(myListings.length)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My listings</Text>
          {loading ? <ActivityIndicator color={C.accent} /> :
            myListings.length === 0 ? (
              <Text style={styles.emptyTxt}>You haven&apos;t posted anything yet.</Text>
            ) : (
              myListings.map((l) => (
                <TouchableOpacity
                  key={l.id} testID={`my-listing-${l.id}`}
                  style={styles.listingRow}
                  onPress={() => router.push(`/listing/${l.id}`)}
                >
                  <View style={[styles.dot2, { backgroundColor: l.type === "trip" ? C.primary : C.accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listingTitle} numberOfLines={1}>{l.title}</Text>
                    <Text style={styles.listingRoute}>{l.origin_city} → {l.destination_city} • €{l.price_estimate}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusBg(l.status) }]}>
                    <Text style={[styles.statusTxt, { color: statusColor(l.status) }]}>{l.status.replace("_", " ")}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
        </View>

        <TouchableOpacity testID="profile-signout-btn" style={styles.signOutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={C.error} />
          <Text style={styles.signOutTxt}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, label, value }: any) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Ionicons name={icon} size={16} color={C.accent} />
      <Text style={{ fontSize: 18, fontWeight: "800", color: C.primary, marginTop: 4 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: C.textMuted }}>{label}</Text>
    </View>
  );
}

function statusBg(s: string) {
  return s === "active" ? "#D1FAE5" : s === "in_transit" ? "#FFF1E5" : s === "delivered" ? "#E8F0F9" : "#F3F4F6";
}
function statusColor(s: string) {
  return s === "active" ? C.success : s === "in_transit" ? C.accent : s === "delivered" ? C.primary : C.textMuted;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { alignItems: "center", padding: 24, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarTxt: { color: "#fff", fontSize: 36, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800", color: C.text },
  email: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF1E5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  badgeTxt: { color: C.accent, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statRow: { flexDirection: "row", marginTop: 20, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: C.bg, borderRadius: R, alignSelf: "stretch" },
  divider: { width: 1, backgroundColor: C.border },
  section: { padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: C.primary, marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  emptyTxt: { color: C.textMuted, fontSize: 13 },
  listingRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderRadius: R, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  dot2: { width: 8, height: 8, borderRadius: 4 },
  listingTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  listingRoute: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, marginHorizontal: 20, borderRadius: R, borderWidth: 1, borderColor: C.error },
  signOutTxt: { color: C.error, fontWeight: "700" },
});
