// =====================================================
// src/pages/ChatbotPage.jsx - UPDATED WITH VOICE
// =====================================================

import { useState, useEffect, useRef } from "react";
import { useChatbotStore } from "../stores/chatbotStore";
import { useAuthStore } from "../stores/authStore";
import {
  FaPaperPlane,
  FaRobot,
  FaUser,
  FaTrashAlt,
  FaChartLine,
  FaPlay,
} from "react-icons/fa";
import LoadingSpinner from "../components/common/LoadingSpinner";
import VoiceInput from "../components/common/VoiceInput"; // Import Voice Input

export default function ChatbotPage() {
  // --- Left Section Stores (Chatbot) ---
  const { messages, sendMessage, isLoading, clearHistory, generateBriefing } =
    useChatbotStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // --- Right Section Stores (Briefing) ---
  const { user } = useAuthStore();

  const [briefingResponse, setBriefingResponse] = useState(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  // Auto-scroll for chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // --- Actions ---
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = input;
    setInput("");
    await sendMessage(userMessage);
  };

  // Callback for voice input
  const handleVoiceTranscription = (text) => {
    setInput(text);
  };

  const handleGenerateBriefing = async () => {
    setIsBriefingLoading(true);
    setBriefingResponse(null);

    const prompt =
      "Give me the detailed daily report of all the CNC_LATHE, Laser_Engraver, Manual_Arc_Welder machines for today";

    try {
      const response = await generateBriefing(prompt);
      setBriefingResponse(response);
    } catch (error) {
      setBriefingResponse(
        "Failed to generate briefing. Please check your connection and try again."
      );
    } finally {
      setIsBriefingLoading(false);
    }
  };

  const clearBriefing = () => {
    setBriefingResponse(null);
  };

  const quickActions = [
    "Show equipment status",
    "Recent alerts",
    "Maintenance schedule",
    "Analytics overview",
  ];

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
      {/* ================= GLOBAL PAGE HEADER ================= */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FaRobot className="text-blue-600" /> AI Operations Center
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Powered by MaViK-39 Neural Engine & Whisper Voice AI
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= LEFT SECTION: STANDARD CHATBOT ================= */}
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Section Header */}
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <FaUser className="text-indigo-600" /> General Assistant
            </h2>
            <button
              onClick={clearHistory}
              className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
              title="Clear Chat History"
            >
              <FaTrashAlt className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar relative">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-80">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <FaRobot className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  How can I help you?
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mb-6">
                  Ask about status, schedules, or alerts.
                </p>

                <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(action)}
                      className="px-3 py-2 text-[13px] font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 border border-gray-100 hover:border-blue-100 transition-all text-left truncate"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className="space-y-2">
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="flex items-end gap-2 max-w-[90%] flex-row-reverse">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 border border-indigo-200">
                          <FaUser className="w-3 h-3 text-indigo-700" />
                        </div>
                        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-3 py-2 shadow-sm text-sm">
                          {msg.message}
                        </div>
                      </div>
                    </div>

                    {/* Bot Response */}
                    <div className="flex justify-start">
                      <div className="flex items-end gap-2 max-w-[90%]">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                          <FaRobot className="w-3 h-3 text-emerald-700" />
                        </div>
                        <div className="bg-gray-50 text-gray-800 rounded-2xl rounded-tl-none px-3 py-2 shadow-sm border border-gray-100 text-sm whitespace-pre-wrap">
                          {msg.response || (
                            <div className="flex gap-1 py-1">
                              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-75" />
                              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-150" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.response && (
                  <div className="flex justify-start animate-pulse">
                    <div className="flex items-end gap-2 max-w-[85%]">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                        <FaRobot className="w-3 h-3 text-emerald-700" />
                      </div>
                      <div className="bg-gray-50 rounded-2xl rounded-tl-none px-3 py-2 shadow-sm border border-gray-100">
                        <div className="flex gap-1">
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-75" />
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-150" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-1 pl-1 flex gap-2 items-center">
              {/* Insert Voice Input Here */}
              <VoiceInput 
                 onTranscriptionComplete={handleVoiceTranscription} 
                 disabled={isLoading}
              />
              
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit(e);
                  }
                }}
                placeholder="Type or speak..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-700 placeholder-gray-400"
                disabled={isLoading}
              />
              <button
                onClick={handleChatSubmit}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <FaPaperPlane className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SECTION: DAILY BRIEFING ================= */}
        {/* ... (Kept exactly as original) ... */}
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Section Header */}
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <FaChartLine className="text-blue-600" /> Daily Briefing
            </h2>
            <button
              onClick={clearBriefing}
              className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
              title="Clear Briefing"
            >
              <FaTrashAlt className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Briefing Display Area (Middle) */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar relative bg-white">
            {!briefingResponse && !isBriefingLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-80">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <FaChartLine className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  Ready to generate report
                </p>
                <p className="text-xs text-gray-400 mt-2 max-w-xs">
                  Click generate below to view the daily summary for CNC Lathe,
                  Laser Engraver, and Welding units.
                </p>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="flex items-end gap-2 max-w-[95%]">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 border border-blue-200">
                    <FaRobot className="w-3 h-3 text-blue-700" />
                  </div>

                  {isBriefingLoading ? (
                    <div className="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 text-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100 text-sm whitespace-pre-wrap leading-relaxed">
                      {briefingResponse}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer (Bottom) */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-2">
              <button
                onClick={handleGenerateBriefing}
                disabled={isBriefingLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm"
              >
                {isBriefingLoading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    <FaPlay className="w-3 h-3" /> Generate Daily Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}