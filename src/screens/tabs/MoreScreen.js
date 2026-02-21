// src/screens/tabs/MoreScreen.js
import React from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet } from "react-native";
import Screen from "../../components/Screen";
import { colors } from "../../theme/colors";

export default function MoreScreen({ navigation }) {
  const items = [
    {
      title: "Full Schedule",
      subtitle: "Browse everything happening at the event",
      onPress: () => navigation.navigate("Schedule"),
    },
    {
      title: "Presenters",
      subtitle: "View all speakers and moderators",
      onPress: () => navigation.navigate("Presenters"),
    },
  ];

  return (
    <Screen>
      <SafeAreaView style={styles.wrap}>
        <Text style={styles.title}>More</Text>

        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.title}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.card,
                pressed ? { opacity: 0.9, transform: [{ scale: 0.995 }] } : null,
              ]}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              <Text style={styles.cardCta}>OPEN →</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.slateGray,
    padding: 16,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.78)",
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  cardCta: {
    marginTop: 12,
    color: colors.cnigaRed,
    fontWeight: "900",
    letterSpacing: 2,
  },
});