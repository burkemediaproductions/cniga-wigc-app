import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors as themeColors } from "../theme/colors";

export default function Screen({
  children,
  gradientColors = [themeColors.bg1, themeColors.bg0],
  style,
}) {
  return (
    <SafeAreaView style={[styles.safe, style]}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: themeColors.bg0 },
});
