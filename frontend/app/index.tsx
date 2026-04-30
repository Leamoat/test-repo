import { useEffect } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../src/auth";
import { C } from "../src/theme";

export default function Index() {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }
  if (user) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/welcome" />;
}
