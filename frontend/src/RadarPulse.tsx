import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { C } from "./theme";

const Ring = ({ delay, color }: { delay: number; color: string }) => {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false)
    );
  }, [delay, s]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.2 + s.value * 1.4 }],
    opacity: 0.45 * (1 - s.value),
  }));
  return <Animated.View style={[styles.ring, { borderColor: color }, style]} />;
};

export default function RadarPulse({ size = 220, color = C.accent }: { size?: number; color?: string }) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none" testID="radar-pulse">
      <Ring delay={0} color={color} />
      <Ring delay={700} color={color} />
      <Ring delay={1400} color={color} />
      <View style={[styles.center, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 2,
  },
  center: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
