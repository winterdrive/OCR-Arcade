import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
// import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  base: '/OCR-Arcade/',
  plugins: [
    react(),
    // viteSingleFile(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
    entries: ['index.html'],
  },
  server: {
    headers: {
      // Cross-Origin Isolation headers for ONNX Runtime multi-threading
      // Required for SharedArrayBuffer support
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless', // Changed from require-corp for better compatibility
    },
  },
})
