import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, formatErr } from "../../src/api";
import { C, R } from "../../src/theme";

export default function Create() {
  const router = useRouter();
  const [type, setType] = useState<"parcel" | "trip">("parcel");
  const [title, setTitle] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destCountry, setDestCountry] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    if (!title || !originCity || !destCity || !weight || !price || !date) {
      setErr("Please fill all required fields"); return;
    }
    let iso: string;
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) throw new Error();
      iso = d.toISOString();
    } catch {
      setErr("Date format must be YYYY-MM-DD"); return;
    }
    setLoading(true);
    try {
      const body = {
        type, title, description: desc,
        origin_city: originCity, origin_country: originCountry || "—",
        destination_city: destCity, destination_country: destCountry || "—",
        travel_date: iso,
        weight_kg: parseFloat(weight), price_estimate: parseFloat(price),
      };
      const r = await api.post("/listings", body);
      Alert.alert("Posted", "Your listing is now live.");
      router.replace(`/listing/${r.data.id}`);
      // reset
      setTitle(""); setOriginCity(""); setDestCity(""); setWeight(""); setPrice(""); setDate(""); setDesc("");
    } catch (e) { setErr(formatErr(e)); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.root} testID="create-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Post a listing</Text>
          <Text style={styles.sub}>Choose what you want to share.</Text>

          <View style={styles.toggle}>
            <TouchableOpacity testID="create-type-parcel" onPress={() => setType("parcel")} style={[styles.toggleBtn, type === "parcel" && styles.toggleActive]}>
              <Ionicons name="cube" size={18} color={type === "parcel" ? "#fff" : C.primary} />
              <Text style={[styles.toggleTxt, type === "parcel" && { color: "#fff" }]}>Parcel to send</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="create-type-trip" onPress={() => setType("trip")} style={[styles.toggleBtn, type === "trip" && styles.toggleActive]}>
              <Ionicons name="airplane" size={18} color={type === "trip" ? "#fff" : C.primary} />
              <Text style={[styles.toggleTxt, type === "trip" && { color: "#fff" }]}>Trip to share</Text>
            </TouchableOpacity>
          </View>

          <Field label="Title">
            <TextInput testID="create-title" style={styles.input} value={title} onChangeText={setTitle} placeholder="Paris → Dakar Aug 12" placeholderTextColor="#9CA3AF" />
          </Field>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="From city">
                <TextInput testID="create-origin-city" style={styles.input} value={originCity} onChangeText={setOriginCity} placeholder="Paris" placeholderTextColor="#9CA3AF" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Country">
                <TextInput testID="create-origin-country" style={styles.input} value={originCountry} onChangeText={setOriginCountry} placeholder="France" placeholderTextColor="#9CA3AF" />
              </Field>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="To city">
                <TextInput testID="create-dest-city" style={styles.input} value={destCity} onChangeText={setDestCity} placeholder="Dakar" placeholderTextColor="#9CA3AF" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Country">
                <TextInput testID="create-dest-country" style={styles.input} value={destCountry} onChangeText={setDestCountry} placeholder="Senegal" placeholderTextColor="#9CA3AF" />
              </Field>
            </View>
          </View>

          <Field label="Travel date (YYYY-MM-DD)">
            <TextInput testID="create-date" style={styles.input} value={date} onChangeText={setDate} placeholder="2026-08-12" placeholderTextColor="#9CA3AF" />
          </Field>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Weight (kg)">
                <TextInput testID="create-weight" style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="5" placeholderTextColor="#9CA3AF" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Price (€)">
                <TextInput testID="create-price" style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="80" placeholderTextColor="#9CA3AF" />
              </Field>
            </View>
          </View>

          <Field label="Description">
            <TextInput testID="create-desc" style={[styles.input, { height: 90, textAlignVertical: "top" }]} multiline value={desc} onChangeText={setDesc} placeholder="Add helpful details" placeholderTextColor="#9CA3AF" />
          </Field>

          {err ? <Text style={styles.err} testID="create-error">{err}</Text> : null}

          <TouchableOpacity testID="create-submit-btn" style={[styles.btn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Post listing</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Field = ({ label, children }: any) => (
  <View style={{ marginTop: 14 }}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 28, fontWeight: "800", color: C.primary },
  sub: { color: C.textMuted, marginTop: 2, marginBottom: 18 },
  toggle: { flexDirection: "row", gap: 8, marginBottom: 8 },
  toggleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: R, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
  },
  toggleActive: { backgroundColor: C.primary, borderColor: C.primary },
  toggleTxt: { color: C.primary, fontWeight: "700" },
  label: { fontSize: 12, color: C.textMuted, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text,
  },
  btn: { backgroundColor: C.accent, borderRadius: R, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  err: { color: C.error, marginTop: 12 },
});
