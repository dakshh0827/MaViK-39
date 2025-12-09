// src/components/chatbot/ChatWidget.jsx
import { useState, useEffect, useRef } from "react";
import { useChatbotStore } from "../../stores/chatbotStore";
import { FaRobot, FaPaperPlane, FaTimes, FaCommentDots } from "react-icons/fa";
import LoadingSpinner from "../common/LoadingSpinner";
import VoiceInput from "../common/VoiceInput";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  
  // Access store functions and state
  const { messages, sendMessage, isLoading, initSession } = useChatbotStore();

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  };

  // Handler for when voice transcription finishes
  const handleVoiceTranscription = (text) => {
    if (text) {
      setInput(text);
      // Optional: Uncomment the line below to auto-send immediately after speaking
      // sendMessage(text); 
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <FaRobot className="text-white w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">MaViK Assistant</h3>
                <p className="text-xs text-blue-100 opacity-90">Powered by Whisper AI</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-blue-100 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FaTimes />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-4">
                <FaRobot className="w-12 h-12 mb-3 opacity-20 text-blue-600" />
                <p className="text-sm font-medium text-gray-500">How can I help you today?</p>
                <p className="text-xs text-gray-400 mt-1">Try asking about equipment status or maintenance schedules.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div key={idx} className="space-y-1">
                    {/* User Message */}
                    {msg.message && (
                      <div className="flex justify-end">
                        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2 text-sm max-w-[85%] shadow-sm">
                          {msg.message}
                        </div>
                      </div>
                    )}
                    
                    {/* Bot Response */}
                    <div className="flex justify-start">
                       <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2 text-sm max-w-[85%] shadow-sm whitespace-pre-wrap leading-relaxed">
                        {msg.response || (
                          <div className="flex gap-1 py-1 items-center">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              {/* Voice Input Button */}
              <VoiceInput 
                onTranscriptionComplete={handleVoiceTranscription}
                disabled={isLoading}
              />
              
              {/* Text Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type or speak..."
                className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                disabled={isLoading}
              />
              
              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-sm flex items-center justify-center"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <FaPaperPlane className="w-3.5 h-3.5 translate-x-[-1px] translate-y-[1px]" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center transform hover:scale-105 active:scale-95 group"
          aria-label="Open Chat"
        >
          <FaCommentDots className="w-7 h-7 group-hover:animate-pulse" />
        </button>
      )}
    </div>
  );
}