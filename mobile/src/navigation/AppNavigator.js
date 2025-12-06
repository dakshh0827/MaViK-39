import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../context/useAuthStore";

// Screens
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import VerifyEmailScreen from "../screens/auth/VerifyEmailScreen"; // <--- New Screen
import MainTabNavigator from "./MainTabNavigator";
import EquipmentDetailsScreen from "../screens/equipment/EquipmentDetailsScreen";
import EquipmentListScreen from "../screens/equipment/EquipmentListScreen";
import QRScannerScreen from "../screens/equipment/QRScannerScreen";
import ChatbotScreen from "../screens/ai/ChatbotScreen";

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
