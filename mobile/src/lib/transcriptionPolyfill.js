export const transcriptionHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="status">Initializing...</div>
  
  <script type="module">
    import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

    // --- Configuration ---
    env.allowLocalModels = false;
    
    // SAFETY CHECK: Check if Cache API is available (requires Secure Context)
    if ('caches' in window) {
      env.useBrowserCache = true;
      console.log("✅ Cache API detected. Model caching enabled.");
    } else {
      env.useBrowserCache = false;
      console.warn("⚠️ Cache API missing. Model caching disabled (will download every time).");
    }

    // Send logs to React Native
    const log = (msg, data = null) => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          type: 'log', 
          message: msg, 
          data: data 
        }));
      }
    };

    const error = (msg) => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          type: 'error', 
          message: msg 
        }));
      }
    };

    let transcriber = null;
    let isPipelineLoading = false;

    async function initPipeline() {
      if (transcriber) return transcriber;
      if (isPipelineLoading) return null; // Prevent double init

      try {
        isPipelineLoading = true;
        log("🔄 Loading Whisper pipeline...");

        // Using base model
        transcriber = await pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-base.en", 
          { quantized: true }
        );
        
        log("✅ Pipeline ready!");
        return transcriber;
      } catch (err) {
        error("Failed to load pipeline: " + err.message);
        throw err;
      } finally {
        isPipelineLoading = false;
      }
    }

    // The transcription logic
    async function transcribeAudio(base64Audio) {
      let audioContext = null;

      try {
        log("🎙️ Starting transcription processing...");
        
        // Ensure pipeline is loaded
        const pipelineInstance = await initPipeline();
        if (!pipelineInstance) {
           // If it's still initializing or failed
           if (!transcriber) throw new Error("Pipeline not initialized");
        }

        // 1. Decode Audio
        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;

        // Create Audio Context
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 48000
        });

        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // 2. Resample to 16kHz
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

        // 3. Check Amplitude
        const rms = Math.sqrt(float32Data.reduce((sum, val) => sum + val * val, 0) / float32Data.length);
        if (rms < 0.001) {
          throw new Error("Audio volume too low - please speak louder");
        }

        // 4. Transcribe
        log("📝 Transcribing text...");
        const output = await transcriber(float32Data, {
          language: 'en',
        });

        // 5. Extract Text
        let text = '';
        if (output && typeof output === 'object') {
          if (output.text) {
            text = output.text.trim();
          } else if (Array.isArray(output) && output[0]?.text) {
            text = output[0].text.trim();
          }
        }

        if (!text) {
          throw new Error("No speech detected");
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          type: 'success', 
          text: text 
        }));

      } catch (err) {
        error(err.message || "Transcription failed");
      } finally {
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
      }
    }

    // Handle messages from React Native
    const handleRNMessage = (event) => {
      try {
        if (!event.data) return;
        const payload = JSON.parse(event.data);
        if (payload.type === 'transcribe') {
          transcribeAudio(payload.audio);
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    };

    // Listeners for both platform standards
    document.addEventListener('message', handleRNMessage);
    window.addEventListener('message', handleRNMessage);

    // Initial Signal
    log("WebView Engine Loaded");
    
    // Preload the model immediately on load
    initPipeline();
  </script>
</body>
</html>
`;
