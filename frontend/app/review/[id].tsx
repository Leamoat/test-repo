import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, formatErr } from "../../src/api";
import { C, R } from "../../src/theme";

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post("/reviews", { delivery_id: id, rating, comment });
      Alert.alert("Thanks!", "Your review has been posted.", [{ text: "OK", onPress: () => router.replace("/(tabs)") }]);
    } catch (e) { Alert.alert("Error", formatErr(e)); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.root} testID="review-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} testID="review-close">
              <Ionicons name="close" size={28} color={C.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Leave a review</Text>
          <Text style={styles.sub}>Help build trust on boxRadar.</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} testID={`star-${n}`} onPress={() => setRating(n)}>
                <Ionicons name="star" size={44} color={n <= rating ? C.accent : C.border} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Your comment</Text>
          <TextInput
            testID="review-comment"
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            multiline
            placeholder="How did the delivery go?"
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity testID="review-submit" style={[styles.btn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Submit review</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  headerRow: { alignItems: "flex-end", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: C.primary },
  sub: { fontSize: 14, color: C.textMuted, marginTop: 4, marginBottom: 32 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 },
  label: { fontSize: 12, color: C.textMuted, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R, padding: 14, minHeight: 120, fontSize: 14, color: C.text, textAlignVertical: "top" },
  btn: { backgroundColor: C.accent, paddingVertical: 16, borderRadius: R, alignItems: "center", marginTop: 24 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
