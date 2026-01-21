import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";

const WEBHOOK_URL =
  "https://aaryannn1234.app.n8n.cloud/webhook/55d1251c-a027-43a2-ab26-ddfa93b742fd/chat";

export const useChatbotStore = create((set, get) => ({
  messages: [],
  isLoading: false,
  sessionId: uuidv4(),

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

  fetchHistory: async () => {
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

        // REFACTOR: Flatten history into individual bubbles
        if (Array.isArray(data)) {
          data.forEach((msg) => {
            // Determine role based on n8n structure
            const isUser = msg.role === "user" || msg.type === "human";

            uiMessages.push({
              _id: uuidv4(), // Give every message a unique ID
              text: msg.text || msg.content || "",
              role: isUser ? "user" : "ai",
              createdAt: new Date(),
            });
          });

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

    // 1. Create User Message Object
    const userMsg = {
      _id: uuidv4(),
      text: message,
      role: "user", // Explicitly set role
      createdAt: new Date(),
    };

    // 2. Add User Message to State immediately
    set((state) => ({
      messages: [...state.messages, userMsg],
      isLoading: true,
    }));

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

      let botText =
        "I received your message but couldn't process the response.";

      if (data && typeof data === "object") {
        if (data.output) botText = data.output;
        else if (data.text) botText = data.text;
        else if (Array.isArray(data) && data[0]?.output)
          botText = data[0].output;
        else if (data.data) botText = data.data;
      }

      // 3. Create Bot Message Object
      const botMsg = {
        _id: uuidv4(),
        text: botText,
        role: "ai",
        createdAt: new Date(),
      };

      // 4. Append Bot Message to State (Don't overwrite user message)
      set((state) => ({
        messages: [...state.messages, botMsg],
        isLoading: false,
      }));
    } catch (error) {
      console.error("Chat error:", error);

      const errorMsg = {
        _id: uuidv4(),
        text: "Error: Could not connect to the AI assistant.",
        role: "ai",
        isError: true,
      };

      set((state) => ({
        messages: [...state.messages, errorMsg],
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

// helloo dakshhhhh
