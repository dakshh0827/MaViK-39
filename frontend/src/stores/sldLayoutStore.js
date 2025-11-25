/*
 * =====================================================
 * frontend/src/stores/sldLayoutStore.js (FIXED)
 * =====================================================
 * Zustand store for SLD layout management
 */
import { create } from "zustand";
import api from "../lib/axios";

export const useSLDLayoutStore = create((set, get) => ({
  layouts: {}, // Store layouts by labId
  isLoading: false,
  error: null,

  // Fetch layout for a specific lab
  fetchLayout: async (labId) => {
    try {
      set({ isLoading: true, error: null });
      // FIX: Changed from template literal to parentheses
      const response = await api.get(`/sld-layouts/${labId}`);
      
      set((state) => ({
        layouts: {
          ...state.layouts,
          [labId]: response.data.data,
        },
        isLoading: false,
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch layout";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Update layout for a specific lab
  updateLayout: async (labId, layoutData) => {
    try {
      set({ isLoading: true, error: null });
      // FIX: Changed from template literal to parentheses
      const response = await api.put(`/sld-layouts/${labId}`, layoutData);
      
      set((state) => ({
        layouts: {
          ...state.layouts,
          [labId]: response.data.data,
        },
        isLoading: false,
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update layout";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Get cached layout for a lab
  getLayout: (labId) => {
    return get().layouts[labId] || null;
  },

  // Clear error
  clearError: () => set({ error: null }),
}));