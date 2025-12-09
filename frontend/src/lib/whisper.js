// Alternative implementation using dynamic imports
let transformersModule = null;
let transcriber = null;
let isLoading = false;

async function loadTransformersModule() {
  if (transformersModule) return transformersModule;
  
  try {
    // Dynamic import to defer loading
    transformersModule = await import('@xenova/transformers');
    
    // Configure AFTER import
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

export async function loadWhisper() {
  if (transcriber) return transcriber;
  if (isLoading) {
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return transcriber;
  }

  isLoading = true;
  console.log("🎤 Loading Whisper model...");

  try {
    const transformers = await loadTransformersModule();
    
    transcriber = await transformers.pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en",
      {
        quantized: true,
        progress_callback: (progress) => {
          if (progress.status === 'downloading') {
            const percent = progress.progress ? Math.round(progress.progress) : 0;
            console.log(`📥 ${progress.file}: ${percent}%`);
          }
        }
      }
    );

    console.log("✅ Whisper ready!");
    return transcriber;

  } catch (err) {
    console.error("❌ Load failed:", err);
    transcriber = null;
    throw err;
  } finally {
    isLoading = false;
  }
}

export async function transcribeAudio(audioBlob) {
  try {
    const transcriber = await loadWhisper();
    
    // Convert to ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Decode audio
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
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

    // Transcribe
    const output = await transcriber(float32Data, {
      language: 'english',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    audioContext.close();

    const text = Array.isArray(output) ? output[0]?.text : output?.text;
    
    if (!text?.trim()) {
      throw new Error("No speech detected");
    }

    return text;

  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}