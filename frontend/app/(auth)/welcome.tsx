import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import RadarPulse from "../../src/RadarPulse";
import { C, R } from "../../src/theme";

export default function Welcome() {
  const router = useRouter();
  return (
    <View style={styles.root} testID="welcome-screen">
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1757820470004-fe7d9f6d57a9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG1hcCUyMHBhdHRlcm58ZW58MHx8fHwxNzc3NTgzNTgwfDA&ixlib=rb-4.1.0&q=85" }}
        style={StyleSheet.absoluteFill}
        imageStyle={{ opacity: 0.18 }}
      />
      <LinearGradient
        colors={[C.primary, C.primaryLight, "#0A1F3D"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.hero}>
          <RadarPulse size={260} color={C.accent} />
          <Text style={styles.brand}>boxRadar</Text>
          <Text style={styles.tag}>Send parcels with travelers.</Text>
          <Text style={styles.tag2}>Europe ⇄ Africa, face‑to‑face.</Text>
        </View>

        <View style={styles.bottom}>
          <View style={styles.featureRow}>
            <Feature label="No online payment" />
            <Feature label="Validation code" />
            <Feature label="Trusted reviews" />
          </View>
          <TouchableOpacity
            testID="welcome-create-account-btn"
            style={styles.primaryBtn}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.primaryTxt}>Create account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="welcome-signin-btn"
            style={styles.secondaryBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.secondaryTxt}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const Feature = ({ label }: { label: string }) => (
  <View style={styles.feat}>
    <View style={styles.dot} />
    <Text style={styles.featTxt}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.primary },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  brand: { color: "#fff", fontSize: 44, fontWeight: "800", letterSpacing: -1, marginTop: 24 },
  tag: { color: "#fff", fontSize: 16, opacity: 0.9, marginTop: 12 },
  tag2: { color: C.accent, fontSize: 16, fontWeight: "600", marginTop: 4 },
  bottom: { padding: 24, gap: 12 },
  featureRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  feat: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  featTxt: { color: "#fff", fontSize: 12, opacity: 0.9 },
  primaryBtn: {
    backgroundColor: C.accent, borderRadius: R, paddingVertical: 16, alignItems: "center",
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  primaryTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: { paddingVertical: 14, alignItems: "center" },
  secondaryTxt: { color: "#fff", fontSize: 14, opacity: 0.9 },
});
