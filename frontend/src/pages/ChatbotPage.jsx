// =====================================================
// 23. src/pages/ChatbotPage.jsx
// =====================================================

import { useState, useEffect, useRef } from "react";
import { useChatbotStore } from "../stores/chatbotStore";
import { FaPaperPlane, FaRobot, FaUser } from "react-icons/fa";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function ChatbotPage() {
  const { messages, fetchHistory, sendMessage, isLoading } = useChatbotStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");

    try {
      await sendMessage(userMessage);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const quickActions = [
    "Show equipment status",
    "Recent alerts",
    "Maintenance schedule",
    "Analytics overview",
  ];

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 p-4 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FaRobot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Start a conversation with the AI assistant
              </p>
              <div className="mt-6 space-y-2">
                <p className="text-sm text-gray-600 mb-2">Quick actions:</p>
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(action)}
                    className="block w-full px-4 py-2 text-sm bg-blue-50 text-blue-900 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index}>
                {/* User Message */}
                <div className="flex items-start gap-3 justify-end mb-2">
                  <div className="bg-blue-900 text-white rounded-lg px-4 py-2 max-w-[70%]">
                    {msg.message}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FaUser className="w-4 h-4 text-blue-900" />
                  </div>
                </div>

                {/* Bot Response */}
                {msg.response && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FaRobot className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[70%]">
                      {msg.response}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <FaRobot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <LoadingSpinner size="sm" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <FaPaperPlane className="w-4 h-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}