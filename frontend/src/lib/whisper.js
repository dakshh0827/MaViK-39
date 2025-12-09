import { pipeline, env } from "@xenova/transformers";

// Skip local model checks since we are running in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;

export async function loadWhisper() {
  if (!transcriber) {
    console.log("Loading Whisper model...");
    // Using quantized tiny model for speed in browser
    transcriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en"
    );
    console.log("Whisper model loaded.");
  }
  return transcriber;
}

export async function transcribeAudio(audioBlob) {
  try {
    const transcriber = await loadWhisper();
    
    // Convert Blob to URL for the pipeline to process
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Run transcription
    const output = await transcriber(audioUrl, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'english',
      task: 'transcribe',
    });

    // Cleanup
    URL.revokeObjectURL(audioUrl);
    
    // Return the text
    return Array.isArray(output) ? output[0].text : output.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}