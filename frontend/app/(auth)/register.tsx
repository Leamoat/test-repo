import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { formatErr } from "../../src/api";
import { C, R } from "../../src/theme";

const TYPES: { key: "sender" | "traveler" | "pro"; label: string; desc: string; icon: any }[] = [
  { key: "sender", label: "Sender", desc: "I want to send a parcel", icon: "cube-outline" },
  { key: "traveler", label: "Traveler", desc: "I'm traveling and have space", icon: "airplane-outline" },
  { key: "pro", label: "Pro carrier", desc: "I do regular trips", icon: "ribbon-outline" },
];

export default function Register() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<"sender" | "traveler" | "pro">("sender");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      await signUp({ email: email.trim(), password, full_name: fullName.trim(), user_type: type, phone });
      router.replace("/(tabs)");
    } catch (e) {
      setErr(formatErr(e));
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.root} testID="register-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => (step === 0 ? router.back() : setStep(0))} style={styles.back} testID="register-back-btn">
            <Ionicons name="chevron-back" size={28} color={C.primary} />
          </TouchableOpacity>

          {step === 0 ? (
            <>
              <Text style={styles.title}>Join boxRadar</Text>
              <Text style={styles.subtitle}>How will you use the app?</Text>
              <View style={{ gap: 12, marginTop: 24 }}>
                {TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    testID={`register-type-${t.key}`}
                    style={[styles.card, type === t.key && styles.cardActive]}
                    onPress={() => setType(t.key)}
                  >
                    <View style={[styles.iconBox, type === t.key && { backgroundColor: C.accent }]}>
                      <Ionicons name={t.icon} size={22} color={type === t.key ? "#fff" : C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardLabel}>{t.label}</Text>
                      <Text style={styles.cardDesc}>{t.desc}</Text>
                    </View>
                    {type === t.key && <Ionicons name="checkmark-circle" size={24} color={C.accent} />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity testID="register-step-next-btn" style={styles.btn} onPress={() => setStep(1)}>
                <Text style={styles.btnTxt}>Continue</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Your details</Text>
              <Text style={styles.subtitle}>We use this to build trust between users.</Text>

              <Text style={styles.label}>Full name</Text>
              <TextInput testID="register-name-input" style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Aminata Diop" placeholderTextColor="#9CA3AF" />

              <Text style={styles.label}>Email</Text>
              <TextInput testID="register-email-input" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor="#9CA3AF" />

              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput testID="register-phone-input" style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+221 77 ..." placeholderTextColor="#9CA3AF" />

              <Text style={styles.label}>Password (min 6 chars)</Text>
              <TextInput testID="register-password-input" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" placeholderTextColor="#9CA3AF" />

              {err ? <Text style={styles.err} testID="register-error">{err}</Text> : null}

              <TouchableOpacity testID="register-submit-btn" style={[styles.btn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Create account</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 24, paddingTop: 8 },
  back: { width: 44, height: 44, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: C.primary, marginBottom: 4 },
  subtitle: { fontSize: 15, color: C.textMuted },
  label: { fontSize: 13, color: C.textMuted, fontWeight: "600", marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: C.text },
  btn: { backgroundColor: C.accent, borderRadius: R, paddingVertical: 16, alignItems: "center", marginTop: 28 },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  err: { color: C.error, marginTop: 12 },
  card: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R,
    padding: 16, flexDirection: "row", alignItems: "center", gap: 14,
  },
  cardActive: { borderColor: C.accent, backgroundColor: "#FFF8F2" },
  iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F0F4FA", alignItems: "center", justifyContent: "center" },
  cardLabel: { fontSize: 16, fontWeight: "700", color: C.primary },
  cardDesc: { fontSize: 13, color: C.textMuted, marginTop: 2 },
});
