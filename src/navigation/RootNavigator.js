// src/navigation/RootNavigator.js
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import TabsNavigator from "./TabsNavigator";

import SignInScreen from "../screens/auth/SignInScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import ScheduleScreen from "../screens/tabs/ScheduleScreen";
import SponsorsScreen from "../screens/tabs/SponsorsScreen";
import EventDetailScreen from "../screens/tabs/EventDetailScreen";
import PresenterDetailScreen from "../screens/tabs/PresenterDetailScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { booting, user } = useAuth();

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator>

      {/* Always available */}
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: "Reset Password" }}
      />

      {user ? (
        <>
          <Stack.Screen
            name="Tabs"
            component={TabsNavigator}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="ScheduleSeminars"
            component={ScheduleScreen}
            initialParams={{ initialView: "sessions" }}
            options={{ title: "Seminars" }}
          />

          <Stack.Screen
            name="ScheduleNetworking"
            component={ScheduleScreen}
            initialParams={{ initialView: "socials" }}
            options={{ title: "Networking" }}
          />

          <Stack.Screen
            name="MySchedule"
            component={ScheduleScreen}
            initialParams={{ initialView: "mine" }}
            options={{ title: "My Schedule" }}
          />

          <Stack.Screen
            name="EventDetail"
            component={EventDetailScreen}
            options={{ title: "Event" }}
          />

          <Stack.Screen
            name="PresenterDetail"
            component={PresenterDetailScreen}
            options={{ title: "Presenter" }}
          />
        </>
      ) : (
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}