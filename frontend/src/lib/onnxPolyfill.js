/**
 * ONNX Runtime Polyfill
 * Fixes the "Cannot read properties of undefined (reading 'registerBackend')" error
 * This must be imported BEFORE @xenova/transformers
 */

// Create global ort object if it doesn't exist
if (typeof window !== 'undefined' && !window.ort) {
  window.ort = {
    env: {
      wasm: {
        wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/',
        numThreads: 1,
        simd: true
      }
    },
    InferenceSession: {},
    Tensor: {},
    registerBackend: () => {},
    backends: {
      wasm: {
        registerBackend: () => {}
      }
    }
  };
}

export {};