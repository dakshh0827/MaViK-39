// mobile/src/stores/chatbotStore.js
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values"; // Required for uuid to work on mobile

// Updated n8n Webhook URL
const WEBHOOK_URL =
  "https://aaryannn1234.app.n8n.cloud/webhook/55d1251c-a027-43a2-ab26-ddfa93b742fd/chat";

export const useChatbotStore = create((set, get) => ({
  messages: [],
  isLoading: false,
  sessionId: uuidv4(), // Temporary ID until we load from storage

  // Initialize session (Async for Mobile)
  initSession: async () => {
    try {
      let id = await AsyncStorage.getItem("n8n_chat_session");
      if (!id) {
        id = uuidv4();
        await AsyncStorage.setItem("n8n_chat_session", id);
      }
      set({ sessionId: id });
      return id;
    } catch (e) {
      console.error("Failed to init session", e);
      return get().sessionId;
    }
  },

  // Fetch history
  fetchHistory: async () => {
    // Ensure session is loaded first
    let { sessionId } = get();
    if (!sessionId) sessionId = await get().initSession();

    set({ isLoading: true });

    try {
      const response = await fetch(
        `${WEBHOOK_URL}/history?sessionId=${sessionId}`
      );

      if (response.ok) {
        const data = await response.json();

        const uiMessages = [];
        let currentPair = {};

        if (Array.isArray(data)) {
          data.forEach((msg) => {
            if (msg.role === "user" || msg.type === "human") {
              if (currentPair.message) uiMessages.push(currentPair);
              currentPair = { message: msg.text || msg.content };
            } else {
              currentPair.response = msg.text || msg.content;
              if (currentPair.message) {
                uiMessages.push(currentPair);
                currentPair = {};
              }
            }
          });
          if (currentPair.message) uiMessages.push(currentPair);

          set({ messages: uiMessages, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.warn("Failed to fetch history", error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (message) => {
    const { sessionId } = get();
    set({ isLoading: true });

    // Optimistically add user message to UI
    const tempMessage = { message, response: null };
    set((state) => ({ messages: [...state.messages, tempMessage] }));

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "sendMessage",
          chatInput: message,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      let botResponse =
        "I received your message but couldn't process the response.";

      if (data && typeof data === "object") {
        if (data.output) botResponse = data.output;
        else if (data.text) botResponse = data.text;
        else if (Array.isArray(data) && data[0]?.output)
          botResponse = data[0].output;
        else if (data.data) botResponse = data.data;
      }

      set((state) => ({
        messages: state.messages.map((msg, index) =>
          index === state.messages.length - 1
            ? { ...msg, response: botResponse }
            : msg
        ),
        isLoading: false,
      }));
    } catch (error) {
      console.error("Chat error:", error);
      set((state) => ({
        messages: state.messages.map((msg, index) =>
          index === state.messages.length - 1
            ? {
                ...msg,
                response: "Error: Could not connect to the AI assistant.",
              }
            : msg
        ),
        isLoading: false,
      }));
    }
  },

  generateBriefing: async (prompt) => {
    const { sessionId } = get();

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "sendMessage",
          chatInput: prompt,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      let botResponse = "No data available.";
      if (data && typeof data === "object") {
        if (data.output) botResponse = data.output;
        else if (data.text) botResponse = data.text;
        else if (Array.isArray(data) && data[0]?.output)
          botResponse = data[0].output;
        else if (data.data) botResponse = data.data;
      }
      return botResponse;
    } catch (error) {
      console.error("Briefing error:", error);
      throw new Error("Failed to fetch briefing data");
    }
  },

  clearHistory: async () => {
    try {
      await AsyncStorage.removeItem("n8n_chat_session");
      const newId = uuidv4();
      await AsyncStorage.setItem("n8n_chat_session", newId);
      set({ messages: [], sessionId: newId });
    } catch (e) {
      console.error("Failed to clear history", e);
    }
  },
}));
