import { useState, useRef } from "react";
import { FaMicrophone, FaStop, FaSpinner } from "react-icons/fa";
import { transcribeAudio } from "../../lib/whisper.js";

export default function VoiceInput({ onTranscriptionComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        await handleTranscription(blob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const handleTranscription = async (blob) => {
    try {
      const text = await transcribeAudio(blob);
      if (text && text.trim()) {
        onTranscriptionComplete(text.trim());
      }
    } catch (error) {
      console.error("Processing error:", error);
      alert("Failed to process audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || isProcessing}
      className={`p-2 rounded-lg transition-all shadow-sm flex items-center justify-center ${
        isRecording
          ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
          : isProcessing
          ? "bg-gray-100 text-gray-500 cursor-wait"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-blue-600"
      }`}
      title={isRecording ? "Stop Recording" : "Voice Input"}
    >
      {isProcessing ? (
        <FaSpinner className="w-4 h-4 animate-spin" />
      ) : isRecording ? (
        <FaStop className="w-4 h-4" />
      ) : (
        <FaMicrophone className="w-4 h-4" />
      )}
    </button>
  );
}