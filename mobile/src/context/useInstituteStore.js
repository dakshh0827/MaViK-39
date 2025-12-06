import { create } from "zustand";
import client from "../api/client";

export const useInstituteStore = create((set) => ({
  institutes: [],
  isLoading: false,
  error: null,

  fetchInstitutes: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await client.get("/institutes");
      // Assuming the API returns { status: 'success', data: [...] } or just the array in data
      // Adjust response.data.data based on your actual API response structure
      const data = response.data.data || response.data;

      set({ institutes: data, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch institutes:", error);
      set({
        error: error.response?.data?.message || "Failed to load institutes",
        isLoading: false,
      });
    }
  },
}));
