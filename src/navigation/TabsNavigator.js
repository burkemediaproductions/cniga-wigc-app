// src/navigation/TabsNavigator.js
import React from "react";
import { Image, Pressable, View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

// Tabs
import WelcomeScreen from "../screens/tabs/WelcomeScreen";
import ScheduleScreen from "../screens/tabs/ScheduleScreen";
import PresentersScreen from "../screens/tabs/PresentersScreen";
import ProfileScreen from "../screens/tabs/ProfileScreen";
import SponsorsScreen from "../screens/tabs/SponsorsScreen"; // ✅ added

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  return (
	<Tab.Navigator
	  initialRouteName="Welcome"
	  screenOptions={({ navigation, route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.cnigaRed },
        headerTitleStyle: {
          color: "#fff",
          fontWeight: "900",
          letterSpacing: 1,
        },
        headerTitleAlign: "center",

        // ✅ Logo now links Home (Welcome)
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.navigate("Welcome")}
            style={{ paddingLeft: 12 }}
          >
            <Image
              source={require("../../assets/wigc-logo.png")}
              style={{ width: 120, height: 120, resizeMode: "contain" }}
            />
          </Pressable>
        ),

        // ✅ Only Profile icon remains
        headerRight: () => (
          <View style={styles.rightIcons}>
            <Pressable
              onPress={() => navigation.navigate("Profile")}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="My Profile"
            >
              <Ionicons name="person-circle-outline" size={24} color="#fff" />
            </Pressable>
          </View>
        ),

        tabBarStyle: { backgroundColor: colors.cnigaRed },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "rgba(255,255,255,0.75)",

        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === "Networking"
              ? "chatbubbles-outline"
              : route.name === "Seminars"
              ? "mic-outline"
              : route.name === "Presenters"
              ? "people-outline"
              : route.name === "Sponsors"
              ? "ribbon-outline"
              : "ellipse-outline";

          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
		<Tab.Screen
		  name="Networking"
		  component={ScheduleScreen}
		  initialParams={{ initialView: "socials" }}
		  listeners={({ navigation }) => ({
			tabPress: () => {
			  navigation.navigate("Networking", {
				initialView: "socials",
				resetKey: Date.now(),
			  });
			},
		  })}
		  options={{
			tabBarLabel: "Networking",
			headerTitle: "Networking",
		  }}
		/>

		<Tab.Screen
		  name="Seminars"
		  component={ScheduleScreen}
		  initialParams={{ initialView: "sessions" }}
		  listeners={({ navigation }) => ({
			tabPress: () => {
			  navigation.navigate("Seminars", {
				initialView: "sessions",
				resetKey: Date.now(),
			  });
			},
		  })}
		  options={{
			tabBarLabel: "Seminars",
			headerTitle: "Seminars",
		  }}
		/>
      <Tab.Screen
        name="Presenters"
        component={PresentersScreen}
        options={{ title: "Presenters" }}
      />

      {/* ✅ Sponsors now a bottom tab */}
      <Tab.Screen
        name="Sponsors"
        component={SponsorsScreen}
        options={{ title: "Sponsors" }}
      />

      {/* Hidden Profile screen */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "My Profile",
          tabBarButton: () => null,
        }}
      />

      {/* Keep Welcome accessible but hidden from tabs */}
      <Tab.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  rightIcons: { flexDirection: "row", alignItems: "center", paddingRight: 10 },
  iconBtn: { padding: 8 },
});