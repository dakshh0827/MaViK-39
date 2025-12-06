import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Screens
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import SLDScreen from "../screens/sld/SLDScreen"; // <--- Updated Import
import AlertsScreen from "../screens/alerts/AlertsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#2196F3", // MaViK Blue
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          paddingBottom: 5,
          height: 70,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-dashboard"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* --- REPLACED EQUIPMENT LIST WITH SLD DIAGRAM --- */}
      <Tab.Screen
        name="SLD"
        component={SLDScreen}
        options={{
          tabBarLabel: "Diagram",
          headerShown: false, // Hide default header because SLDScreen has a custom one
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="sitemap" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="bell-ring"
              color={color}
              size={size}
            />
          ),
          // You can connect this badge to your auth/alert store if you want dynamic counts
          // tabBarBadge: 3,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
