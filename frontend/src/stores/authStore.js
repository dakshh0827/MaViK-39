// =====================================================
// 2. src/stores/authStore.js (MODIFIED)
// =====================================================

import { create } from "zustand";
import api from "../lib/axios";

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null, // We store the access token in memory
  isAuthenticated: false,
  isLoading: true, // Start as true to allow checkAuth to run

  register: async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  verifyEmail: async (email, otp) => {
    try {
      const response = await api.post("/auth/verify-email", { email, otp });
      // The backend now sends 'accessToken'
      const { accessToken, user } = response.data.data;
      // No more localStorage
      set({ user, accessToken, isAuthenticated: true });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  resendOtp: async (email) => {
    try {
      const response = await api.post("/auth/resend-otp", { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  login: async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      // The backend now sends 'accessToken'
      const { accessToken, user } = response.data.data;
      // No more localStorage
      set({ user, accessToken, isAuthenticated: true });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  logout: async () => {
    try {
      // Call the backend to clear the HttpOnly cookie
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Always clear the client-side state
      set({ user: null, accessToken: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    // This function will now try to get the user profile.
    // The axios interceptor will handle refreshing if the token is expired.
    set({ isLoading: true });
    try {
      const response = await api.get("/auth/profile");
      // If this succeeds, the interceptor either used a valid accessToken
      // or successfully refreshed it.
      set({
        user: response.data.data,
        isAuthenticated: true,
        isLoading: false,
        // The token is already in state, set by the interceptor if it refreshed
      });
    } catch (error) {
      // If this fails, it means the refresh token was invalid or expired
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await api.put("/auth/profile", data);
      set({ user: response.data.data });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
}));
