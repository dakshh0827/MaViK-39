// =====================================================
// src/pages/ChatbotPage.jsx - COMPLETE UPDATED VERSION
// =====================================================

import { useState, useEffect, useRef } from "react";
import { useChatbotStore } from "../stores/chatbotStore";
import { useAuthStore } from "../stores/authStore";
import { useInstituteStore } from "../stores/instituteStore";
import { useLabStore } from "../stores/labStore";
import { FaPaperPlane, FaRobot, FaUser, FaTrashAlt, FaChartLine, FaPlay } from "react-icons/fa";
import LoadingSpinner from "../components/common/LoadingSpinner";

// Hardcoded Equipment List (Not fetched from database)
const SAMPLE_EQUIPMENT = [
  "Centrifuge 5424R",
  "Confocal Microscope",
  "Incubator Shaker",
  "Autoclave",
  "Spectrophotometer",
  "PCR Machine",
  "Fume Hood",
  "Biosafety Cabinet"
];

// Helper to format Department Enum strings (e.g., "WELDING_FABRICATION" -> "Welding Fabrication")
const formatDepartment = (deptString) => {
  if (!deptString) return "";
  return deptString
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function ChatbotPage() {
  // --- Left Section Stores (Chatbot) ---
  const { messages, sendMessage, isLoading, clearHistory, generateBriefing } = useChatbotStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // --- Right Section Stores (Briefing) ---
  const { user } = useAuthStore();
  const { institutes, fetchInstitutes } = useInstituteStore();
  const { labs, fetchLabs } = useLabStore();

  // State for Filters
  const [briefingFilters, setBriefingFilters] = useState({
    institute: "",
    department: "",
    lab: "",
    equipment: ""
  });

  // Derived state for dropdown options
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableLabs, setAvailableLabs] = useState([]);
  
  const [briefingResponse, setBriefingResponse] = useState(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  // Auto-scroll for chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // --- Initial Data Fetching Based on Role ---
  useEffect(() => {
    const role = user?.role || "";
    
    if (role === 'POLICY_MAKER') {
      // Policy Maker starts by fetching institutes
      fetchInstitutes();
    } else if (role === 'LAB_MANAGER') {
      // Lab Manager fetches their accessible labs immediately
      fetchLabs();
    }
    // Trainer doesn't need to fetch anything initially
  }, [user?.role, fetchInstitutes, fetchLabs]);

  // --- Filter Handlers ---

  // 1. Institute Change (Policy Maker only)
  const handleInstituteChange = async (e) => {
    const instId = e.target.value;
    
    // Reset subsequent filters
    setBriefingFilters({ 
      institute: instId, 
      department: "", 
      lab: "", 
      equipment: "" 
    });
    setAvailableDepartments([]);
    setAvailableLabs([]);

    if (instId) {
      try {
        // Fetch labs for this institute to derive departments
        const result = await fetchLabs({ institute: instId });
        
        if (result && result.data) {
          // Extract unique departments from the fetched labs
          const depts = [...new Set(result.data.map(lab => lab.department))].filter(Boolean);
          setAvailableDepartments(depts.sort());
        }
      } catch (error) {
        console.error('Failed to fetch labs for institute:', error);
      }
    }
  };

  // 2. Department Change (Policy Maker only)
  const handleDepartmentChange = (e) => {
    const dept = e.target.value;
    
    setBriefingFilters(prev => ({ 
      ...prev, 
      department: dept, 
      lab: "", 
      equipment: "" 
    }));

    // Filter the already fetched labs by selected institute and department
    if (dept && briefingFilters.institute) {
      const filtered = labs.filter(lab => 
        lab.instituteId === briefingFilters.institute && 
        lab.department === dept
      );
      setAvailableLabs(filtered);
    } else {
      setAvailableLabs([]);
    }
  };

  // 3. Lab Change (Policy Maker & Lab Manager)
  const handleLabChange = (e) => {
    setBriefingFilters(prev => ({ 
      ...prev, 
      lab: e.target.value,
      equipment: "" 
    }));
  };

  // 4. Equipment Change (All Roles)
  const handleEquipmentChange = (e) => {
    setBriefingFilters(prev => ({ 
      ...prev, 
      equipment: e.target.value 
    }));
  };

  // --- Actions ---
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = input;
    setInput("");
    await sendMessage(userMessage);
  };

  const handleGenerateBriefing = async () => {
    if (!briefingFilters.equipment) return;

    setIsBriefingLoading(true);
    setBriefingResponse(null);
    
    // Prompt exactly as requested
    const prompt = `show daily usage of ${briefingFilters.equipment}`;
    
    try {
      const response = await generateBriefing(prompt);
      setBriefingResponse(response);
    } catch (error) {
      setBriefingResponse("Failed to generate briefing. Please check your connection and try again.");
    } finally {
      setIsBriefingLoading(false);
    }
  };

  const clearBriefing = () => {
    setBriefingResponse(null);
    setBriefingFilters({
        institute: "",
        department: "",
        lab: "",
        equipment: ""
    });
    setAvailableDepartments([]);
    setAvailableLabs([]);
  };

  const quickActions = [
    "Show equipment status",
    "Recent alerts",
    "Maintenance schedule",
    "Analytics overview",
  ];

  // Helper: Check if 'Generate' button should be enabled
  const isBriefingReady = () => {
    const role = user?.role;
    
    if (role === 'POLICY_MAKER') {
      // Policy Maker needs all fields: institute → department → lab → equipment
      return briefingFilters.institute && 
             briefingFilters.department && 
             briefingFilters.lab && 
             briefingFilters.equipment;
    }
    if (role === 'LAB_MANAGER') {
      // Lab Manager needs: lab → equipment
      return briefingFilters.lab && briefingFilters.equipment;
    }
    if (role === 'TRAINER') {
      // Trainer only needs: equipment
      return !!briefingFilters.equipment;
    }
    return false;
  };

  // Helper to get the list of labs to show in dropdown
  const getLabOptions = () => {
    if (user?.role === 'POLICY_MAKER') {
      // Use filtered labs based on selected institute and department
      return availableLabs;
    }
    // Lab Manager uses all their accessible labs
    return labs;
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
      
      {/* ================= GLOBAL PAGE HEADER ================= */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center shrink-0">
        <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FaRobot className="text-blue-600" /> AI Operations Center
            </h1>
            <p className="text-xs text-gray-500 mt-1">
            Powered by MaViK-39 Neural Engine
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
                        className="px-3 py-2 text-[10px] font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 border border-gray-100 hover:border-blue-100 transition-all text-left truncate"
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
                
                {isLoading && messages[messages.length-1]?.response && (
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
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-1 pl-3 flex gap-2 items-center">
                    <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleChatSubmit(e);
                        }
                    }}
                    placeholder="Type your message..."
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
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Section Header */}
            <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <FaChartLine className="text-purple-600" /> Daily Briefing
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
                         <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                            <FaChartLine className="w-8 h-8 text-purple-600" />
                        </div>
                        <p className="text-sm text-gray-500">Configure parameters below to generate a report.</p>
                        <div className="text-xs text-gray-400 mt-2 flex flex-col gap-1">
                            {user?.role === 'POLICY_MAKER' && <span>Flow: Institute → Department → Lab → Equipment</span>}
                            {user?.role === 'LAB_MANAGER' && <span>Flow: Lab → Equipment</span>}
                            {user?.role === 'TRAINER' && <span>Flow: Select Equipment</span>}
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-start">
                        <div className="flex items-end gap-2 max-w-[95%]">
                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 border border-purple-200">
                                <FaRobot className="w-3 h-3 text-purple-700" />
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

            {/* Filters Footer (Bottom) */}
            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-2 space-y-2">
                    
                    {/* --- Filter Dropdowns Grid --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        
                        {/* 1. Institute (Policy Maker Only) */}
                        {user?.role === 'POLICY_MAKER' && (
                            <select 
                                className="w-full text-xs border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white py-2"
                                value={briefingFilters.institute}
                                onChange={handleInstituteChange}
                            >
                                <option value="">Select Institute...</option>
                                {institutes.map(inst => (
                                    <option key={inst.instituteId} value={inst.instituteId}>{inst.name}</option>
                                ))}
                            </select>
                        )}

                        {/* 2. Department (Policy Maker Only) */}
                        {user?.role === 'POLICY_MAKER' && (
                            <select 
                                className="w-full text-xs border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white py-2"
                                value={briefingFilters.department}
                                onChange={handleDepartmentChange}
                                disabled={!briefingFilters.institute}
                            >
                                <option value="">Select Department...</option>
                                {availableDepartments.map((dept, idx) => (
                                    <option key={idx} value={dept}>{formatDepartment(dept)}</option>
                                ))}
                            </select>
                        )}

                        {/* 3. Lab (Policy Maker & Lab Manager) */}
                        {(user?.role === 'POLICY_MAKER' || user?.role === 'LAB_MANAGER') && (
                            <select 
                                className={`w-full text-xs border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white py-2 ${
                                    user?.role === 'POLICY_MAKER' ? 'sm:col-span-2' : 'sm:col-span-1'
                                }`}
                                value={briefingFilters.lab}
                                onChange={handleLabChange}
                                disabled={user?.role === 'POLICY_MAKER' && !briefingFilters.department}
                            >
                                <option value="">Select Lab...</option>
                                {getLabOptions().map(lab => (
                                    <option key={lab.labId} value={lab.labId}>{lab.name}</option>
                                ))}
                            </select>
                        )}

                        {/* 4. Equipment (All Roles) - HARDCODED */}
                        <select 
                            className={`w-full text-xs border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white py-2 ${
                                user?.role === 'TRAINER' ? 'sm:col-span-2' : 
                                user?.role === 'LAB_MANAGER' ? 'sm:col-span-1' : 
                                'sm:col-span-2'
                            }`}
                            value={briefingFilters.equipment}
                            onChange={handleEquipmentChange}
                            disabled={
                                (user?.role === 'POLICY_MAKER' && !briefingFilters.lab) || 
                                (user?.role === 'LAB_MANAGER' && !briefingFilters.lab)
                            }
                        >
                            <option value="">Select Equipment...</option>
                            {SAMPLE_EQUIPMENT.map((eq, idx) => (
                                <option key={idx} value={eq}>{eq}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleGenerateBriefing}
                        disabled={!isBriefingReady() || isBriefingLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {isBriefingLoading ? <LoadingSpinner size="sm" color="white" /> : (
                            <>
                                <FaPlay className="w-2.5 h-2.5" /> Generate Briefing
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