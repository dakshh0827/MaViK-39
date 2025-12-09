import { useState, useRef, useEffect } from "react";
import { FaMicrophone, FaStop } from "react-icons/fa";
import { transcribeAudio } from "../../lib/whisper";

export default function VoiceInput({ onTranscriptionComplete, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      // Request microphone with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;

      // Use webm/opus format which is well-supported
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      console.log("Using mime type:", mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Audio chunk received:", event.data.size, "bytes");
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("Recording stopped, processing...");
        await handleTranscription();
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setError("Recording failed: " + event.error.message);
        setIsRecording(false);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      console.log("Recording started");

    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Microphone access denied or unavailable");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("Stopping recording...");
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscription = async () => {
    if (audioChunksRef.current.length === 0) {
      setError("No audio data captured");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log("Creating audio blob from", audioChunksRef.current.length, "chunks");
      
      // Create blob from recorded chunks
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current.mimeType 
      });
      
      console.log("Audio blob created:", {
        size: audioBlob.size,
        type: audioBlob.type
      });

      if (audioBlob.size < 1000) {
        throw new Error("Recording too short or empty");
      }

      // Transcribe audio
      const text = await transcribeAudio(audioBlob);
      console.log("✅ Transcription successful:", text);

      // Pass result to parent
      if (onTranscriptionComplete) {
        onTranscriptionComplete(text);
      }

    } catch (err) {
      console.error("Processing error:", err);
      setError(err.message || "Failed to process audio");
      
      // Don't keep showing the error forever
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const handleClick = () => {
    if (disabled || isProcessing) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative flex items-center">
      <button
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className={`
          p-2 rounded-lg transition-all duration-200 
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }
          ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          disabled:hover:bg-gray-100
        `}
        title={isRecording ? "Stop Recording" : "Start Voice Input"}
        type="button"
      >
        {isProcessing ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : isRecording ? (
          <FaStop className="w-4 h-4" />
        ) : (
          <FaMicrophone className="w-4 h-4" />
        )}
      </button>

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 animate-fade-in">
          {error}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500" />
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="ml-2 flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-500 font-medium">Recording...</span>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="ml-2 flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs text-blue-500 font-medium">Processing...</span>
        </div>
      )}
    </div>
  );
}