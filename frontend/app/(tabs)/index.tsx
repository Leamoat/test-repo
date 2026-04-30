import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { C, R } from "../../src/theme";
import RadarPulse from "../../src/RadarPulse";

type Listing = {
  id: string; type: "parcel" | "trip"; title: string;
  origin_city: string; origin_country: string;
  destination_city: string; destination_country: string;
  weight_kg: number; price_estimate: number;
  travel_date: string; user_name: string; user_rating: number;
};

export default function Discover() {
  const router = useRouter();
  const [tab, setTab] = useState<"trip" | "parcel">("trip");
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/listings", {
        params: { type: tab, origin: origin || undefined, destination: dest || undefined },
      });
      setItems(r.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [tab, origin, dest]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.root} testID="discover-screen">
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1757820470004-fe7d9f6d57a9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG1hcCUyMHBhdHRlcm58ZW58MHx8fHwxNzc3NTgzNTgwfDA&ixlib=rb-4.1.0&q=85" }}
        style={styles.header} imageStyle={{ opacity: 0.15, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
      >
        <SafeAreaView edges={["top"]}>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
            <Text style={styles.brand}>boxRadar</Text>
            <Text style={styles.greeting}>Find a route, send a parcel.</Text>

            <View style={styles.tabs}>
              <TouchableOpacity testID="tab-trip" onPress={() => setTab("trip")} style={[styles.tabBtn, tab === "trip" && styles.tabActive]}>
                <Ionicons name="airplane-outline" size={18} color={tab === "trip" ? "#fff" : "#fff"} />
                <Text style={[styles.tabTxt, tab === "trip" && styles.tabTxtActive]}>Find a trip</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="tab-parcel" onPress={() => setTab("parcel")} style={[styles.tabBtn, tab === "parcel" && styles.tabActive]}>
                <Ionicons name="cube-outline" size={18} color="#fff" />
                <Text style={[styles.tabTxt, tab === "parcel" && styles.tabTxtActive]}>Find a parcel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchInput}>
                <Ionicons name="location-outline" size={16} color={C.textMuted} />
                <TextInput
                  testID="search-origin"
                  value={origin} onChangeText={setOrigin}
                  placeholder="From" placeholderTextColor="#9CA3AF"
                  style={styles.searchTxt} onSubmitEditing={load} returnKeyType="search"
                />
              </View>
              <View style={styles.searchInput}>
                <Ionicons name="flag-outline" size={16} color={C.textMuted} />
                <TextInput
                  testID="search-destination"
                  value={dest} onChangeText={setDest}
                  placeholder="To" placeholderTextColor="#9CA3AF"
                  style={styles.searchTxt} onSubmitEditing={load} returnKeyType="search"
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

      {loading ? (
        <View style={styles.center}>
          <RadarPulse size={140} />
          <Text style={{ color: C.textMuted, marginTop: 12 }}>Scanning routes…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <RadarPulse size={120} />
          <Text style={styles.empty}>No {tab === "trip" ? "trips" : "parcels"} match your search.</Text>
          <Text style={styles.emptySub}>Try clearing filters or post your own listing.</Text>
        </View>
      ) : (
        <FlatList
          testID="listings-list"
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
          renderItem={({ item }) => <ListingCard item={item} onPress={() => router.push(`/listing/${item.id}`)} />}
        />
      )}
    </View>
  );
}

export function ListingCard({ item, onPress }: { item: Listing; onPress: () => void }) {
  const date = new Date(item.travel_date);
  const dateStr = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return (
    <TouchableOpacity testID={`listing-card-${item.id}`} onPress={onPress} style={styles.card} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={[styles.typeBadge, { backgroundColor: item.type === "trip" ? "#E8F0F9" : "#FFF1E5" }]}>
          <Ionicons name={item.type === "trip" ? "airplane" : "cube"} size={12} color={item.type === "trip" ? C.primary : C.accent} />
          <Text style={[styles.typeBadgeTxt, { color: item.type === "trip" ? C.primary : C.accent }]}>{item.type === "trip" ? "TRIP" : "PARCEL"}</Text>
        </View>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
          <Text style={styles.dateTxt}>{dateStr}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>

      <View style={styles.routeRow}>
        <View style={styles.routePill}>
          <Text style={styles.routeCity}>{item.origin_city}</Text>
          <Text style={styles.routeCountry}>{item.origin_country}</Text>
        </View>
        <View style={styles.routeLine}>
          <View style={styles.line} />
          <Ionicons name="arrow-forward" size={14} color={C.accent} />
          <View style={styles.line} />
        </View>
        <View style={styles.routePill}>
          <Text style={styles.routeCity}>{item.destination_city}</Text>
          <Text style={styles.routeCountry}>{item.destination_country}</Text>
        </View>
      </View>

      <View style={styles.cardFoot}>
        <View style={styles.userRow}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{item.user_name?.[0] ?? "U"}</Text></View>
          <View>
            <Text style={styles.userName}>{item.user_name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="star" size={11} color={C.accent} />
              <Text style={styles.userRating}>{item.user_rating?.toFixed(1) ?? "-"}</Text>
            </View>
          </View>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>{item.weight_kg}kg</Text>
          <Text style={styles.price}>€{item.price_estimate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.primary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  brand: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  greeting: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 4, marginBottom: 16 },
  tabs: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R, padding: 4, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: R - 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  tabActive: { backgroundColor: C.accent },
  tabTxt: { color: "#fff", fontSize: 14, fontWeight: "600", opacity: 0.85 },
  tabTxtActive: { opacity: 1, fontWeight: "700" },
  searchRow: { flexDirection: "row", gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: "#fff", borderRadius: R, paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  searchTxt: { flex: 1, color: C.text, fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  empty: { color: C.text, fontSize: 16, fontWeight: "600", marginTop: 16, textAlign: "center" },
  emptySub: { color: C.textMuted, fontSize: 13, marginTop: 6, textAlign: "center" },
  card: {
    backgroundColor: C.surface, borderRadius: R, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeTxt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  dateBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateTxt: { color: C.textMuted, fontSize: 12, fontWeight: "600" },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  routeRow: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 8 },
  routePill: { flex: 1 },
  routeCity: { color: C.primary, fontSize: 15, fontWeight: "700" },
  routeCountry: { color: C.textMuted, fontSize: 11 },
  routeLine: { flexDirection: "row", alignItems: "center", gap: 4, marginHorizontal: 4 },
  line: { width: 16, height: 1.5, backgroundColor: C.accent, borderRadius: 1 },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  userRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontWeight: "700" },
  userName: { color: C.text, fontSize: 13, fontWeight: "600" },
  userRating: { color: C.textMuted, fontSize: 11 },
  priceBox: { alignItems: "flex-end" },
  priceLabel: { color: C.textMuted, fontSize: 11, fontWeight: "600" },
  price: { color: C.accent, fontSize: 18, fontWeight: "800" },
});
