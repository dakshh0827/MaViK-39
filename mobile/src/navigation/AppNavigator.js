import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../context/useAuthStore";

// Screens
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import VerifyEmailScreen from "../screens/auth/VerifyEmailScreen";
import MainTabNavigator from "./MainTabNavigator";
import EquipmentDetailsScreen from "../screens/equipment/EquipmentDetailsScreen";
import EquipmentListScreen from "../screens/equipment/EquipmentListScreen";
import QRScannerScreen from "../screens/equipment/QRScannerScreen";
import ChatbotScreen from "../screens/ai/ChatbotScreen";
import LabAnalyticsScreen from "../screens/dashboard/LabAnalyticsScreen"; // <--- IMPORT THIS

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { token, checkLogin } = useAuthStore();

  useEffect(() => {
    checkLogin();
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        // User is Logged In
        <>
          <Stack.Screen name="Back" component={MainTabNavigator} />

          {/* Detailed screens that hide the bottom tab bar */}

          <Stack.Screen
            name="EquipmentListScreen"
            component={EquipmentListScreen}
            options={{ headerShown: true, title: "All Equipment" }}
          />

          <Stack.Screen
            name="EquipmentDetails"
            component={EquipmentDetailsScreen}
            options={{ headerShown: true, title: "Machine Details" }}
          />

          {/* --- ADD THIS SCREEN --- */}
          <Stack.Screen
            name="LabAnalytics"
            component={LabAnalyticsScreen}
            options={{ headerShown: false }} // We built a custom header in the screen
          />
          {/* ----------------------- */}

          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{ headerShown: true, title: "Scan QR Code" }}
          />
          <Stack.Screen
            name="ChatbotScreen"
            component={ChatbotScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        // User is NOT Logged In
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
