import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: 'node_modules/@xenova/transformers/dist/*.wasm',
    //       dest: '.'
    //     },
    //     {
    //       src: 'node_modules/onnxruntime-web/dist/*.wasm',
    //       dest: '.'
    //     },
    //     {
    //       src: 'node_modules/onnxruntime-web/dist/*.mjs',
    //       dest: '.'
    //     }
    //   ]
    // })
  ],
  // optimizeDeps: {
  //   exclude: ['@xenova/transformers', 'onnxruntime-web']
  // },
  // server: {
  //   headers: {
  //     'Cross-Origin-Opener-Policy': 'same-origin',
  //     'Cross-Origin-Embedder-Policy': 'require-corp'
  //   }
  // },
  // build: {
  //   rollupOptions: {
  //     output: {
  //       manualChunks: {
  //         'transformers': ['@xenova/transformers']
  //       }
  //     }
  //   }
  // }
});