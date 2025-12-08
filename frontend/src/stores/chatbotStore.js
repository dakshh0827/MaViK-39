// =====================================================
// src/stores/chatbotStore.js
// =====================================================

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

// Updated n8n Webhook URL
const WEBHOOK_URL = "https://aaryannn1234.app.n8n.cloud/webhook/55d1251c-a027-43a2-ab26-ddfa93b742fd/chat";

export const useChatbotStore = create((set, get) => ({
  messages: [],
  isLoading: false,
  sessionId: localStorage.getItem("n8n_chat_session") || uuidv4(),

  // Initialize session if not exists
  initSession: () => {
    let id = localStorage.getItem("n8n_chat_session");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("n8n_chat_session", id);
      set({ sessionId: id });
    }
    return id;
  },

  // Fetch history from n8n (if supported by your workflow) or load local state
  fetchHistory: async () => {
    const { sessionId } = get();
    set({ isLoading: true });

    try {
      const response = await fetch(`${WEBHOOK_URL}/history?sessionId=${sessionId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        const uiMessages = [];
        let currentPair = {};

        if (Array.isArray(data)) {
            data.forEach(msg => {
                if (msg.role === 'user' || msg.type === 'human') {
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
            if (currentPair.message) uiMessages.push(currentPair); // Push last incomplete
            
            set({ messages: uiMessages, isLoading: false });
        } else {
            set({ isLoading: false }); 
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.warn("Failed to fetch history, starting fresh.", error);
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
          "Accept": "application/json"
        },
        body: JSON.stringify({
          action: "sendMessage",
          chatInput: message,
          sessionId: sessionId
        }),
      });

      const data = await response.json();
      
      // Parse n8n response
      let botResponse = "I received your message but couldn't process the response.";
      
      if (data && typeof data === 'object') {
          if (data.output) botResponse = data.output;
          else if (data.text) botResponse = data.text;
          else if (Array.isArray(data) && data[0]?.output) botResponse = data[0].output;
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
              ? { ...msg, response: "Error: Could not connect to the AI assistant." } 
              : msg
          ),
        isLoading: false,
      }));
    }
  },

  // NEW: Generate a briefing without affecting the main chat history
  generateBriefing: async (prompt) => {
    // We use the same sessionId to maintain context if needed, or you could generate a temp one.
    const { sessionId } = get();
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          action: "sendMessage",
          chatInput: prompt,
          sessionId: sessionId 
        }),
      });

      const data = await response.json();
      
      let botResponse = "No data available for this equipment.";
      if (data && typeof data === 'object') {
          if (data.output) botResponse = data.output;
          else if (data.text) botResponse = data.text;
          else if (Array.isArray(data) && data[0]?.output) botResponse = data[0].output;
          else if (data.data) botResponse = data.data; 
      }
      return botResponse;
    } catch (error) {
      console.error("Briefing error:", error);
      throw new Error("Failed to fetch briefing data");
    }
  },
  
  clearHistory: () => {
      localStorage.removeItem("n8n_chat_session");
      const newId = uuidv4();
      localStorage.setItem("n8n_chat_session", newId);
      set({ messages: [], sessionId: newId });
  }
}));