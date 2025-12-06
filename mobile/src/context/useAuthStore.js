import { create } from "zustand";
import client from "../api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: true,

  // --- LOGIN ---
  login: async (email, password) => {
    try {
      console.log("Attempting login...");
      const response = await client.post("/auth/login", { email, password });

      // Destructure 'accessToken' from response
      const { user, accessToken } = response.data.data;

      // Safety check
      if (!accessToken) {
        console.error("Login Error: No access token received!");
        return false;
      }

      // Save to phone storage
      await AsyncStorage.setItem("userToken", accessToken);
      await AsyncStorage.setItem("userData", JSON.stringify(user));

      // Update state
      set({ user, token: accessToken, isLoading: false });

      console.log("Login success!");
      return true;
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      return false;
    }
  },

  // --- REGISTER ---
  register: async (userData) => {
    try {
      console.log("Attempting registration...", userData);
      const response = await client.post("/auth/register", userData);
      console.log("Registration success:", response.data);
      return true;
    } catch (error) {
      console.error(
        "Registration error:",
        error.response?.data || error.message
      );
      // Throwing error so UI can display specific message
      throw error.response?.data || new Error("Registration failed");
    }
  },

  // --- VERIFY EMAIL ---
  verifyEmail: async (email, otp) => {
    try {
      console.log(`Verifying email: ${email} with OTP: ${otp}`);
      const response = await client.post("/auth/verify-email", { email, otp });
      console.log("Verification success:", response.data);
      return true;
    } catch (error) {
      console.error(
        "Verification error:",
        error.response?.data || error.message
      );
      throw error.response?.data || new Error("Invalid OTP");
    }
  },

  // --- RESEND OTP ---
  resendOtp: async (email) => {
    try {
      console.log(`Resending OTP to: ${email}`);
      await client.post("/auth/resend-otp", { email });
      return true;
    } catch (error) {
      console.error("Resend OTP error:", error.response?.data || error.message);
      throw error.response?.data || new Error("Failed to resend OTP");
    }
  },

  // --- LOGOUT ---
  logout: async () => {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userData");
    set({ user: null, token: null });
  },

  // --- CHECK LOGIN STATUS ---
  checkLogin: async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const user = await AsyncStorage.getItem("userData");
      if (token && user) {
        set({ token, user: JSON.parse(user), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  },
}));
