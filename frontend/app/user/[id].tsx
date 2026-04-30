import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { C, R } from "../../src/theme";

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => { api.get(`/users/${id}`).then((r) => setData(r.data)); }, [id]);
  if (!data) return <View style={styles.center}><ActivityIndicator color={C.accent} /></View>;
  const u = data.user;

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="user-profile-screen">
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} testID="user-back">
          <Ionicons name="chevron-back" size={28} color={C.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.card}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{u.full_name[0]}</Text></View>
          <Text style={styles.name}>{u.full_name}</Text>
          <View style={styles.badge}>
            <Ionicons name={u.user_type === "traveler" ? "airplane" : u.user_type === "pro" ? "ribbon" : "cube"} size={12} color={C.accent} />
            <Text style={styles.badgeTxt}>{u.user_type.toUpperCase()}</Text>
          </View>
          <View style={styles.statRow}>
            <Stat label="Rating" value={u.rating?.toFixed(1) || "—"} icon="star" />
            <View style={styles.divider} />
            <Stat label="Reviews" value={String(u.review_count || 0)} icon="chatbox" />
          </View>
          {u.bio ? <Text style={styles.bio}>{u.bio}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Reviews</Text>
        {data.reviews.length === 0 ? (
          <Text style={{ color: C.textMuted, fontSize: 13 }}>No reviews yet.</Text>
        ) : (
          data.reviews.map((r: any) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontWeight: "700", color: C.text }}>{r.reviewer_name}</Text>
                <View style={{ flexDirection: "row", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name="star" size={12} color={i < r.rating ? C.accent : C.border} />
                  ))}
                </View>
              </View>
              {r.comment ? <Text style={{ color: C.textMuted, fontSize: 13 }}>{r.comment}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon }: any) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Ionicons name={icon} size={16} color={C.accent} />
      <Text style={{ fontSize: 18, fontWeight: "800", color: C.primary, marginTop: 4 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: C.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { padding: 12 },
  card: { backgroundColor: C.surface, borderRadius: R, padding: 24, alignItems: "center", borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontSize: 32, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800", color: C.text, marginTop: 12 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF1E5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  badgeTxt: { color: C.accent, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statRow: { flexDirection: "row", alignSelf: "stretch", marginTop: 16, padding: 12, backgroundColor: C.bg, borderRadius: R },
  divider: { width: 1, backgroundColor: C.border },
  bio: { color: C.textMuted, fontSize: 13, marginTop: 14, textAlign: "center", lineHeight: 19 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: C.primary, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 },
  reviewCard: { backgroundColor: C.surface, borderRadius: R, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
});
