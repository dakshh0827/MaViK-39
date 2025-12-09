import { useState, useEffect, useRef } from "react";
import { useChatbotStore } from "../../stores/chatbotStore";
import { FaRobot, FaPaperPlane, FaTimes, FaCommentDots, FaUser } from "react-icons/fa";
import LoadingSpinner from "../common/LoadingSpinner";
import VoiceInput from "../common/VoiceInput";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  
  const { messages, sendMessage, isLoading, initSession } = useChatbotStore();

  useEffect(() => {
    initSession();
  }, [initSession]);

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

  const handleVoiceTranscription = (text) => {
    setInput(text);
    // Optional: Auto-send after voice
    // sendMessage(text); 
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <FaRobot className="text-white" />
              <h3 className="font-semibold">MaViK Assistant</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-blue-100 hover:text-white transition-colors"
            >
              <FaTimes />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <FaRobot className="w-8 h-8 mb-2 opacity-50" />
                <p>How can I help you today?</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div key={idx} className="space-y-1">
                    {/* User */}
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-3 py-2 text-sm max-w-[85%] shadow-sm">
                        {msg.message}
                      </div>
                    </div>
                    {/* Bot */}
                    <div className="flex justify-start">
                       <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-none px-3 py-2 text-sm max-w-[85%] shadow-sm whitespace-pre-wrap">
                        {msg.response || (
                          <div className="flex gap-1 py-1">
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

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              <VoiceInput 
                onTranscriptionComplete={handleVoiceTranscription}
                disabled={isLoading}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type or speak..."
                className="flex-1 bg-gray-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isLoading ? <LoadingSpinner size="sm" color="white" /> : <FaPaperPlane className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center transform hover:scale-105"
        >
          <FaCommentDots className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}