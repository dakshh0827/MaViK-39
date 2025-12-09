// Complete rewrite with better model and state handling
let transformersModule = null;

async function loadTransformersModule() {
  if (transformersModule) return transformersModule;
  
  try {
    transformersModule = await import('@xenova/transformers');
    
    transformersModule.env.allowLocalModels = false;
    transformersModule.env.useBrowserCache = true;
    transformersModule.env.backends.onnx.wasm.wasmPaths = 
      'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';
    
    return transformersModule;
  } catch (error) {
    console.error("Failed to load transformers:", error);
    throw error;
  }
}

export async function transcribeAudio(audioBlob) {
  let audioContext = null;
  let transcriber = null;
  
  try {
    console.log("🎙️ Starting transcription...");
    console.log("Audio blob size:", audioBlob.size, "bytes");
    
    // Load transformers
    const transformers = await loadTransformersModule();
    
    // Create a NEW pipeline instance for each transcription
    console.log("Creating fresh Whisper pipeline...");
    transcriber = await transformers.pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-base.en", // Using base model - more reliable than tiny
      {
        quantized: true,
      }
    );
    console.log("✅ Pipeline ready!");
    
    // Convert to ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 48000
    });
    
    // Decode audio
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log("Audio decoded:", {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels
    });

    if (audioBuffer.duration < 0.5) {
      throw new Error("Recording too short - please speak for at least 1 second");
    }
    
    // Resample to 16kHz
    const targetSampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(
      1,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();

    const resampledBuffer = await offlineCtx.startRendering();
    const float32Data = resampledBuffer.getChannelData(0);
    
    console.log("Audio ready:", {
      samples: float32Data.length,
      duration: (float32Data.length / targetSampleRate).toFixed(2) + "s"
    });

    // Check amplitude
    const rms = Math.sqrt(float32Data.reduce((sum, val) => sum + val * val, 0) / float32Data.length);
    console.log("Audio RMS:", rms);
    
    if (rms < 0.001) {
      throw new Error("Audio volume too low - please speak louder");
    }

    // Transcribe with minimal options
    console.log("🔄 Transcribing...");
    const output = await transcriber(float32Data, {
      language: 'en',
    });

    console.log("Raw output:", output);

    // Close audio context
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close();
    }

    // Extract text
    let text = '';
    if (output && typeof output === 'object') {
      if (output.text) {
        text = output.text.trim();
      } else if (Array.isArray(output) && output[0]?.text) {
        text = output[0].text.trim();
      }
    }

    console.log("Final text:", text);
    
    if (!text) {
      throw new Error("No speech detected - please try again and speak clearly");
    }

    return text;

  } catch (error) {
    console.error("❌ Transcription error:", error);
    
    if (audioContext && audioContext.state !== 'closed') {
      try {
        await audioContext.close();
      } catch (e) {
        console.warn("Failed to close audio context:", e);
      }
    }
    
    if (error.message.includes("decodeAudioData")) {
      throw new Error("Audio format error - please try again");
    }
    
    throw error;
  } finally {
    // Always dispose the transcriber
    transcriber = null;
  }
}