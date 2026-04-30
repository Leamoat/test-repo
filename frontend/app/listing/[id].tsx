import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, Alert, ImageBackground, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, formatErr } from "../../src/api";
import { useAuth } from "../../src/auth";
import { C, R } from "../../src/theme";

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOffer, setShowOffer] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMsg, setOfferMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/listings/${id}`).then((r) => { setItem(r.data); setOfferPrice(String(r.data.price_estimate)); }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.accent} /></View>;
  if (!item) return <View style={styles.center}><Text>Not found</Text></View>;

  const isMine = user?.id === item.user_id;
  const date = new Date(item.travel_date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const heroImg = item.type === "trip"
    ? "https://images.pexels.com/photos/30981181/pexels-photo-30981181.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
    : "https://images.unsplash.com/photo-1541544181051-e46607bc22a4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxjYXJkYm9hcmQlMjBwYXJjZWwlMjBoYW5kfGVufDB8fHx8MTc3NzU4MzU4MHww&ixlib=rb-4.1.0&q=85";

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await api.post("/offers", { listing_id: item.id, price: parseFloat(offerPrice), message: offerMsg });
      setShowOffer(false);
      router.push(`/chat/${r.data.conversation_id}`);
    } catch (e) { Alert.alert("Error", formatErr(e)); } finally { setSubmitting(false); }
  };

  return (
    <View style={styles.root} testID="listing-detail-screen">
      <ImageBackground source={{ uri: heroImg }} style={styles.hero}>
        <View style={styles.heroOverlay} />
        <SafeAreaView edges={["top"]} style={{ width: "100%" }}>
          <View style={{ padding: 16 }}>
            <TouchableOpacity testID="listing-back" onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.heroContent}>
          <View style={[styles.typeBadge, { backgroundColor: item.type === "trip" ? C.primary : C.accent }]}>
            <Ionicons name={item.type === "trip" ? "airplane" : "cube"} size={12} color="#fff" />
            <Text style={styles.typeBadgeTxt}>{item.type === "trip" ? "TRIP" : "PARCEL"}</Text>
          </View>
          <Text style={styles.heroTitle}>{item.title}</Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View style={styles.card}>
          <View style={styles.routeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cityLabel}>FROM</Text>
              <Text style={styles.city}>{item.origin_city}</Text>
              <Text style={styles.country}>{item.origin_country}</Text>
            </View>
            <Ionicons name="airplane" size={22} color={C.accent} style={{ transform: [{ rotate: "45deg" }] }} />
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={styles.cityLabel}>TO</Text>
              <Text style={styles.city}>{item.destination_city}</Text>
              <Text style={styles.country}>{item.destination_country}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Meta icon="calendar-outline" label="Date" value={date} />
            <Meta icon="scale-outline" label="Weight" value={`${item.weight_kg} kg`} />
            <Meta icon="cash-outline" label="Price" value={`€${item.price_estimate}`} highlight />
          </View>
        </View>

        {item.description ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.desc}>{item.description}</Text>
          </View>
        ) : null}

        <TouchableOpacity testID="listing-user-card" style={styles.card} onPress={() => router.push(`/user/${item.user_id}`)}>
          <Text style={styles.sectionLabel}>{item.type === "trip" ? "Traveler" : "Sender"}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
            <View style={styles.avatar}><Text style={styles.avatarTxt}>{item.user_name[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{item.user_name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="star" size={13} color={C.accent} />
                <Text style={styles.rating}>{item.user_rating?.toFixed(1) ?? "—"}</Text>
                <Text style={styles.rating2}>· View profile</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
          </View>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: "#FFF8F2", borderColor: "#FFD9B8" }]}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Ionicons name="shield-checkmark" size={20} color={C.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.primary, fontWeight: "700", marginBottom: 4 }}>Face‑to‑face payment</Text>
              <Text style={{ color: C.textMuted, fontSize: 13, lineHeight: 18 }}>
                No online payments on boxRadar. Agree on a price, meet in person, and use the validation code to confirm delivery.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {!isMine && item.status === "active" ? (
        <View style={styles.bottomBar}>
          <TouchableOpacity testID="make-offer-btn" style={styles.cta} onPress={() => setShowOffer(true)}>
            <Ionicons name="paper-plane" size={18} color="#fff" />
            <Text style={styles.ctaTxt}>Make an offer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={showOffer} transparent animationType="slide" onRequestClose={() => setShowOffer(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <TouchableOpacity style={styles.backdrop} onPress={() => setShowOffer(false)} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Make an offer</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Your price (€)</Text>
              <TextInput testID="offer-price-input" style={styles.input} value={offerPrice} onChangeText={setOfferPrice} keyboardType="decimal-pad" />
              <Text style={styles.label}>Message (optional)</Text>
              <TextInput
                testID="offer-message-input"
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                multiline value={offerMsg} onChangeText={setOfferMsg}
                placeholder="Hi! I'd like to send my parcel with you."
                placeholderTextColor="#9CA3AF"
              />
            </ScrollView>
            <TouchableOpacity testID="submit-offer-btn" style={[styles.cta, { marginTop: 16 }]} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <><Ionicons name="paper-plane" size={18} color="#fff" /><Text style={styles.ctaTxt}>Send offer</Text></>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Meta({ icon, label, value, highlight }: any) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Ionicons name={icon} size={16} color={highlight ? C.accent : C.textMuted} />
      <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 4, fontWeight: "600", letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 13, color: highlight ? C.accent : C.text, fontWeight: "700", marginTop: 2, textAlign: "center" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { height: 280, justifyContent: "space-between" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,48,87,0.55)" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  heroContent: { padding: 20 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, alignSelf: "flex-start", marginBottom: 8 },
  typeBadgeTxt: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  card: { backgroundColor: C.surface, borderRadius: R, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 16 },
  cityLabel: { fontSize: 10, fontWeight: "700", color: C.textMuted, letterSpacing: 0.5 },
  city: { fontSize: 22, fontWeight: "800", color: C.primary, marginTop: 4 },
  country: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  sectionLabel: { fontSize: 11, color: C.textMuted, fontWeight: "700", letterSpacing: 0.5 },
  desc: { color: C.text, fontSize: 14, lineHeight: 21, marginTop: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontSize: 18, fontWeight: "700" },
  userName: { fontSize: 16, fontWeight: "700", color: C.text },
  rating: { fontSize: 13, color: C.text, fontWeight: "600" },
  rating2: { fontSize: 12, color: C.textMuted },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28, backgroundColor: "rgba(255,255,255,0.95)", borderTopWidth: 1, borderTopColor: C.border },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, borderRadius: R, paddingVertical: 16 },
  ctaTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: "#fff", padding: 20, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: C.primary, marginBottom: 12 },
  label: { fontSize: 12, color: C.textMuted, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: R, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text },
});
