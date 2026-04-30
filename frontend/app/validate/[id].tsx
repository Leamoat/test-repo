import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, formatErr } from "../../src/api";
import { useAuth } from "../../src/auth";
import { C, R } from "../../src/theme";

export default function Validate() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<any>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/deliveries/${id}`).then((r) => setDelivery(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.accent} /></View>;
  if (!delivery || !user) return null;

  const isSender = user.id === delivery.sender_id;

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/deliveries/${id}/validate`, { code: code.trim() });
      Alert.alert("Delivered ✅", "Delivery successfully validated. You can now leave a review.", [
        { text: "Continue", onPress: () => router.replace(`/review/${id}`) },
      ]);
    } catch (e) { Alert.alert("Invalid code", formatErr(e)); } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.root} testID="validate-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} testID="validate-close">
            <Ionicons name="close" size={28} color={C.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Validation</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={48} color={C.accent} />
          </View>

          {isSender ? (
            <>
              <Text style={styles.title}>Your validation code</Text>
              <Text style={styles.sub}>Show this code to the traveler at delivery. Keep it private until then.</Text>
              <View style={styles.codeBox} testID="validation-code-display">
                {(delivery.validation_code || "").split("").map((d: string, i: number) => (
                  <View key={i} style={styles.codeDigit}><Text style={styles.codeDigitTxt}>{d}</Text></View>
                ))}
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color={C.primary} />
                <Text style={styles.infoTxt}>Once the traveler enters this code, the delivery is marked as completed.</Text>
              </View>
              <TouchableOpacity testID="close-validate-btn" style={styles.btn} onPress={() => router.back()}>
                <Text style={styles.btnTxt}>Got it</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter validation code</Text>
              <Text style={styles.sub}>Ask the sender for the 6‑digit code to confirm delivery.</Text>
              <TextInput
                testID="validation-code-input"
                style={styles.input}
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                placeholder="123456"
                placeholderTextColor="#D1D5DB"
                maxLength={6}
              />
              <TouchableOpacity testID="submit-code-btn" style={[styles.btn, code.length !== 6 && { opacity: 0.5 }]} onPress={submit} disabled={code.length !== 6 || submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Confirm delivery</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.primary },
  body: { flex: 1, alignItems: "center", padding: 24 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#FFF1E5", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "800", color: C.primary, textAlign: "center" },
  sub: { fontSize: 14, color: C.textMuted, marginTop: 8, textAlign: "center", lineHeight: 21, maxWidth: 320 },
  codeBox: { flexDirection: "row", gap: 8, marginTop: 32 },
  codeDigit: { width: 48, height: 64, borderRadius: R, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  codeDigitTxt: { color: "#fff", fontSize: 28, fontWeight: "800" },
  input: { fontSize: 36, fontWeight: "800", letterSpacing: 12, color: C.primary, textAlign: "center", borderBottomWidth: 2, borderBottomColor: C.border, paddingVertical: 16, marginTop: 28, width: 280 },
  infoCard: { flexDirection: "row", gap: 8, marginTop: 24, padding: 14, backgroundColor: "#E8F0F9", borderRadius: R, alignItems: "flex-start" },
  infoTxt: { color: C.primary, fontSize: 13, flex: 1, lineHeight: 19 },
  btn: { backgroundColor: C.accent, paddingVertical: 16, paddingHorizontal: 48, borderRadius: R, marginTop: 32 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
