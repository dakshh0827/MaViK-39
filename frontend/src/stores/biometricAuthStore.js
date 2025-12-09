import { create } from "zustand";
import api from "../lib/axios";

export const useBiometricAuthStore = create((set) => ({
  isAuthenticating: false,
  error: null,
  lastAuth: null,

  authenticate: async (aadhaarNumber, biometricData, equipmentId) => {
    set({ isAuthenticating: true, error: null });
    try {
      const response = await api.post("/equipment-auth/authenticate", {
        aadhaarNumber,
        biometricData,
        equipmentId,
      });
      set({ 
        lastAuth: response.data.data, 
        isAuthenticating: false 
      });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Authentication failed",
        isAuthenticating: false 
      });
      throw error;
    }
  },

  checkEquipmentStatus: async (equipmentId) => {
    try {
      const response = await api.get(`/equipment-auth/status/${equipmentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  revokeAccess: async (equipmentId) => {
    try {
      const response = await api.post(`/equipment-auth/revoke/${equipmentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));