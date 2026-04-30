import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { formatErr } from "../../src/api";
import { C, R } from "../../src/theme";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(formatErr(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} testID="login-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back} testID="login-back-btn">
            <Ionicons name="chevron-back" size={28} color={C.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey on boxRadar.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="login-email-input"
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            testID="login-password-input"
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {err ? <Text style={styles.err} testID="login-error">{err}</Text> : null}
          <TouchableOpacity
            testID="login-submit-btn"
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Sign in</Text>}
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={{ color: C.textMuted }}>New to boxRadar? </Text>
            <Link href="/(auth)/register" testID="login-register-link"><Text style={styles.link}>Create account</Text></Link>
          </View>

          <View style={styles.demoBox} testID="login-demo-credentials">
            <Text style={styles.demoTitle}>Demo accounts</Text>
            <Text style={styles.demoTxt}>aminata@boxradar.app / Demo123!</Text>
            <Text style={styles.demoTxt}>lucas@boxradar.app / Demo123!</Text>
            <Text style={styles.demoTxt}>kwame@boxradar.app / Demo123!</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 24, paddingTop: 8 },
  back: { width: 44, height: 44, justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 32, fontWeight: "800", color: C.primary, marginBottom: 4 },
  subtitle: { fontSize: 15, color: C.textMuted, marginBottom: 28 },
  label: { fontSize: 13, color: C.textMuted, fontWeight: "600", marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: C.text,
  },
  btn: {
    backgroundColor: C.accent, borderRadius: R, paddingVertical: 16,
    alignItems: "center", marginTop: 24,
  },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  err: { color: C.error, marginTop: 12, fontSize: 14 },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  link: { color: C.primary, fontWeight: "700" },
  demoBox: { marginTop: 32, padding: 16, backgroundColor: "#F0F4FA", borderRadius: R, borderWidth: 1, borderColor: C.border },
  demoTitle: { fontWeight: "700", color: C.primary, marginBottom: 8 },
  demoTxt: { fontSize: 13, color: C.textMuted, marginVertical: 2 },
});
