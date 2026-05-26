
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  User, 
  Bot, 
  AlertCircle, 
  Mic, 
  Trash2,
  RefreshCw 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function ChatBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("medidost_messages");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved messages", e);
      }
    }
    return [
      {
        sender: "bot",
        text: "Namaste I'm MediDost AI. I am here to help you identify symptoms and find the right specialist.",
      },
    ];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false); // State for voice input
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem("medidost_session") || "";
  });
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("medidost_messages", JSON.stringify(messages));
  }, [messages]);

  // Helper function to get a new session ID
  const fetchNewSession = async () => {
    try {
      const response = await axios.get("https://medidost-backend.onrender.com/api/session");
      const newId = response.data.sessionId;
      setSessionId(newId);
      localStorage.setItem("medidost_session", newId);
    } catch (error) {
      console.warn("Backend unreachable. Switching to offline demo mode.");
      const demoId = "demo-session-" + Math.random().toString(36).substr(2, 9);
      setSessionId(demoId);
      localStorage.setItem("medidost_session", demoId);
    }
  };

  // Fetch session ID on component mount if not present
  useEffect(() => {
    if (!sessionId) {
      fetchNewSession();
    }
  }, []);

  // Voice Input Handler
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US'; // You can change this to 'hi-IN' for Hindi support
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      alert("Voice input is not supported in this browser.");
    }
  };

  const handleClearChat = () => {
    const defaultMsg = [{
      sender: "bot",
      text: "Chat cleared. How can I help you now?",
    }];
    setMessages(defaultMsg);
    localStorage.removeItem("medidost_messages");
    localStorage.removeItem("medidost_session");
    fetchNewSession();
  };

  const handleBookDoctor = (spec) => {
    navigate("/findDoctor", { state: { specialization: spec } });
    setIsOpen(false);
  };

  // Get context-aware dynamic suggestions based on the last bot response
  const getDynamicSuggestions = () => {
    const botMessages = messages.filter((m) => m.sender === "bot");
    if (botMessages.length === 0) {
      return ["Analyze Symptoms", "Healthy Diet Advice", "Emergency Help"];
    }

    const lastBotMsg = botMessages[botMessages.length - 1];

    // Case 1: High severity alert
    if (lastBotMsg.severity === "high") {
      return ["Find Emergency Hospital", "Ambulance Details", "First Aid Guide"];
    }

    // Case 2: Diagnostic response recommending a specialist
    if (lastBotMsg.isDiagnostic && lastBotMsg.specialist) {
      const spec = lastBotMsg.specialist;
      return [
        `Find ${spec} Now`,
        `${spec} Care Tips`,
        "Healthy Diet Advice"
      ];
    }

    // Case 3: If it's a general message mentioning appointment or doctor
    if (lastBotMsg.text && (lastBotMsg.text.toLowerCase().includes("book") || lastBotMsg.text.toLowerCase().includes("appointment"))) {
      return ["Find General Physician", "Analyze Symptoms", "Emergency Help"];
    }

    // Case 4: Default generic quick action suggestions
    return ["Analyze Symptoms", "Healthy Diet Advice", "Emergency Help"];
  };

  // Handle Dynamic Suggestion click
  const handleSuggestionClick = (suggestionText) => {
    if (suggestionText.startsWith("Find ") && suggestionText.endsWith(" Now")) {
      const botMessages = messages.filter((m) => m.sender === "bot");
      const lastBotMsg = botMessages[botMessages.length - 1];
      if (lastBotMsg && lastBotMsg.specialist) {
        handleBookDoctor(lastBotMsg.specialist);
        return;
      }
    } else if (suggestionText === "Find General Physician") {
      handleBookDoctor("General Physician");
      return;
    }
    handleSend(suggestionText);
  };

  const handleSend = async (text = input) => {
    if (!text.trim()) return;

    const userMessage = { sender: "user", text: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // 2. Send to Backend
      const response = await axios.post("https://medidost-backend.onrender.com/api/chat", {
        message: text,
        sessionId,
      });

      // 3. Add Bot Response
      const { isDiagnostic, reply, possibleCause, specialist, homeCare, severity } = response.data;
          
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: reply,
          isDiagnostic,
          possibleCause,
          specialist,
          homeCare,
          severity
        }
      ]);
    } catch (err) {
      console.warn("Backend offline, generating demo response.");
      
      // FALLBACK / DEMO MODE RESPONSES
      setTimeout(() => {
        let demoMsg = {
          sender: "bot",
          text: "I am currently in Offline Mode (Backend unavailable). I can't connect to the live AI, but I can simulate how I would work.",
          isDiagnostic: false
        };
        
        const lowerInput = text.toLowerCase();
        
        if (lowerInput.includes("fever") || lowerInput.includes("temperature") || lowerInput.includes("flu")) {
          demoMsg = {
            sender: "bot",
            text: "I'm sorry to hear that you have a fever.",
            isDiagnostic: true,
            possibleCause: "Fever could be due to a seasonal viral infection, common cold, or flu.",
            specialist: "General Physician",
            homeCare: [
              "Drink plenty of water and ORS to stay hydrated.",
              "Take adequate bed rest to help your body recover.",
              "Monitor your temperature. Consult a doctor if it goes above 102°F."
            ],
            severity: "medium"
          };
        } else if (lowerInput.includes("skin") || lowerInput.includes("rash") || lowerInput.includes("itch")) {
          demoMsg = {
            sender: "bot",
            text: "It looks like you have a skin irritation or rash.",
            isDiagnostic: true,
            possibleCause: "This could be contact dermatitis or a mild allergic skin reaction.",
            specialist: "Dermatologist",
            homeCare: [
              "Keep the irritated skin clean, dry, and cool.",
              "Avoid scratching or applying heavily scented soaps.",
              "Apply a cold compress to reduce itching and swelling."
            ],
            severity: "medium"
          };
        } else if (lowerInput.includes("appointment") || lowerInput.includes("book")) {
          demoMsg = {
            sender: "bot",
            text: "To book an appointment, you can click on 'Find Doctor' in the menu or use my specialist referral buttons when I analyze symptoms.",
            isDiagnostic: false
          };
        } else if (lowerInput.includes("diet") || lowerInput.includes("food")) {
          demoMsg = {
            sender: "bot",
            text: "For a balanced diet, prioritize whole foods, lean proteins, vegetables, and plenty of water. Avoid processed sugar.",
            isDiagnostic: false
          };
        }

        setMessages((prev) => [...prev, demoMsg]);
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="fixed z-50 flex flex-col items-end bottom-3 right-3 sm:bottom-4 sm:right-4 md:bottom-5 md:right-5lg:bottom-6 lg:right-6">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
className="
w-[90vw]
sm:w-[320px]
md:w-[340px]
lg:w-[360px]
xl:w-[380px]

  h-[65vh]
  sm:h-[68vh]
  md:h-[72vh]
  lg:h-[75vh]
  max-h-[700px]
  min-h-[500px]

  bg-white
  rounded-2xl
  shadow-2xl
  border border-gray-100
  flex flex-col
  overflow-hidden
  mb-3 mt-16
"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 sm:p-4 flex justify-between items-center shadow-md">
              <div className="flex items-center space-x-2 text-white">
<div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
  <Bot size={18} className="text-green-400" />
</div>
                <div>
                  <h3 className="font-bold text-sm">MediDost Assistant</h3>
                  <p className="text-xs text-blue-100 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                 {/* Clear Chat Button */}
                <button 
                  onClick={handleClearChat}
                  className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                  title="Clear Chat"
                >
                  <RefreshCw size={18} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 bg-slate-50 space-y-4">
              {/* Date separator example */}
              <div className="text-center text-xs text-gray-400 my-2">Today</div>

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex items-end max-w-[85%] sm:max-w-[80%] md:max-w-[75%] space-x-2 ${msg.sender === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"}`}>
                    
                    {/* Avatar */}
<div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
  msg.sender === "user" ? "bg-blue-600 text-white" : "bg-blue-500"
}`}>
  {msg.sender === "user" ? (
    <User size={14} />
  ) : (
    <Bot size={14} className="text-green-400" />
  )}
</div>

                    {/* Bubble */}
                    <div
                      className={`p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                        msg.sender === "user"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                      }`}
                    >
                      {msg.sender === "bot" && msg.isDiagnostic ? (
                        <div className="space-y-4 text-xs sm:text-sm">
                          {/* 1. Empathy / Greeting Reply */}
                          <p className="text-gray-800 font-medium">{msg.text}</p>
                          
                          {/* 2. Possible Cause Card */}
                          {msg.possibleCause && (
                            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-blue-900 shadow-sm">
                              <div className="flex items-center gap-1.5 font-bold mb-1 text-blue-800">
                                <span>🔍</span> POSSIBLE CAUSE
                              </div>
                              <p className="text-gray-700 leading-relaxed font-normal">{msg.possibleCause}</p>
                            </div>
                          )}
                          
                          {/* 3. Recommended Doctor Card */}
                          {msg.specialist && (
                            <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-3 text-teal-900 shadow-sm">
                              <div className="flex items-center gap-1.5 font-bold mb-1 text-teal-850">
                                <span>👨‍⚕️</span> RECOMMENDED REFERRAL
                              </div>
                              <p className="text-gray-750 mb-2.5 font-normal">
                                It is highly recommended to consult a <span className="font-semibold text-teal-950 bg-teal-100/50 px-1.5 py-0.5 rounded">{msg.specialist}</span> for a proper clinical checkup.
                              </p>
                              
                              <button
                                onClick={() => handleBookDoctor(msg.specialist)}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-1.5 px-3 rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                              >
                                Find & Book {msg.specialist}
                              </button>
                            </div>
                          )}
                          
                          {/* 4. Home Care Advice (with interactive checklist items) */}
                          {msg.homeCare && msg.homeCare.length > 0 && (
                            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-amber-900 shadow-sm">
                              <div className="flex items-center gap-1.5 font-bold mb-1.5 text-amber-850">
                                <span>💡</span> HOME CARE ADVICE
                              </div>
                              <div className="space-y-1.5">
                                {msg.homeCare.map((advice, adviceIdx) => (
                                  <label key={adviceIdx} className="flex items-start gap-2 cursor-pointer font-normal text-gray-750 hover:text-gray-900 transition-colors">
                                    <input 
                                      type="checkbox" 
                                      className="mt-0.5 w-3.5 h-3.5 accent-amber-600 rounded border-gray-300 text-amber-650 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <span>{advice}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 5. Severity Alert */}
                          {msg.severity === "high" && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-900 shadow-sm flex items-start gap-2 animate-pulse">
                              <span className="text-base">🚨</span>
                              <div>
                                <h4 className="font-bold text-red-800">URGENT MEDICAL ATTENTION:</h4>
                                <p className="text-[11px] sm:text-xs text-red-750 font-normal leading-relaxed">
                                  This appears to be a high-severity symptom. Please seek emergency medical care immediately or visit the nearest hospital.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 6. Medical Disclaimer */}
                          <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400 font-normal leading-tight italic">
                            ⚠️ Disclaimer: This is an AI triage analysis for informational purposes only. It is not a professional diagnosis.
                          </div>
                        </div>
                      ) : (
                        /* Normal plain text reply */
                        msg.text
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-end space-x-2">
<div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
  <Bot size={14} className="text-green-400" />
</div>
                    <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-none shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions Chips (Only show if not loading) */}
            {!isLoading && (
              <div className="px-4 pb-2 bg-slate-50 overflow-x-auto flex gap-2 no-scrollbar">
                {getDynamicSuggestions().map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="whitespace-nowrap bg-white border border-blue-100 text-blue-600 text-xs px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors shadow-sm cursor-pointer active:scale-95"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
<div
  className="
    flex items-center
    bg-gray-100
    rounded-full
    px-2 sm:px-3 md:px-4
    py-2
    focus-within:ring-2
    focus-within:ring-blue-500
    focus-within:bg-white
    transition-all
  "
>
                
                {/* Voice Input Button */}
                <button
                  onClick={startListening}
                  className={`mr-2 p-1.5 rounded-full transition-all ${
                    isListening 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                  title="Speak"
                >
                  <Mic size={18} />
                </button>

                <input
                  type="text"
className="
  flex-1 bg-transparent border-none outline-none
  text-xs sm:text-sm md:text-base
  text-gray-700 placeholder-gray-400
"
                  placeholder={isListening ? "Listening..." : "Type your symptoms..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className={`ml-2 p-2 rounded-full transition-all ${
                    input.trim() 
                      ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <div className="text-center mt-2">
                <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                  <AlertCircle size={10} />
                  AI info may be inaccurate. Not for emergencies.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

{/* Floating Toggle Button */}
<div className="relative flex flex-col items-end">

  {/* Tooltip */}
  {!isOpen && (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
className="
  mb-2 sm:mb-3 mr-1 sm:mr-2
  bg-white text-blue-700
  text-[10px] sm:text-xs
  px-3 sm:px-4
  py-1.5 sm:py-2
  rounded-full shadow-lg
  max-w-[180px] text-center
"
    >
      Need medical help?
    </motion.div>
  )}

  <motion.button
    onClick={() => setIsOpen(!isOpen)}
    whileTap={{ scale: 0.9 }}
    className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-16 md:h-16 lg:w-[70px] lg:h-[70px] rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 shadow-2xl shadow-blue-300/40 transition-all duration-300">
    {/* Breathing Glow ONLY when closed */}
    {!isOpen && (
      <span className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping"></span>
    )}

    {/* Glass Layer */}
    <span className="absolute inset-1 rounded-full bg-white/10 backdrop-blur-sm"></span>

    {/* Smooth Icon Transition */}
    <AnimatePresence mode="wait">
      {isOpen ? (
        <motion.div
          key="close"
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative"
        >
          <X size={26} className="text-white" />
        </motion.div>
      ) : (
        <motion.div
          key="bot"
          initial={{ rotate: 90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: -90, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative"
        >
          <Bot
            size={28}
            className="text-white drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
          />
        </motion.div>
      )}
    </AnimatePresence>

    {/* Online Indicator (only when closed) */}
    {!isOpen && (
      <span className="absolute bottom-2 right-2 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
    )}
  </motion.button>
</div>
    </div>
  );
}
