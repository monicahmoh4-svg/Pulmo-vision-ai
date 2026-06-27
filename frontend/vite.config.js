import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // We provide our own sw.js in /public — so we use injectManifest mode
      // which merges our shell assets list into it at build time.
      strategies: "injectManifest",
      srcDir:     "public",
      filename:   "sw.js",
      // Also copy the manifest (already in /public/manifest.json)
      manifest: false,
      injectManifest: {
        // Assets the SW will precache (built JS/CSS chunks + public assets)
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
      },
      devOptions: {
        enabled:  true,       // SW active in dev so you can test install prompt
        type:     "module",
      },
    }),
  ],

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },

  server: {
    port: 3000,
    proxy: {
      "/api": {
        target:      process.env.VITE_API_URL || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir:    "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Chunk splitting keeps initial load fast
        manualChunks: {
          vendor:   ["react", "react-dom", "react-router-dom"],
          charts:   ["recharts"],
          ui:       ["lucide-react", "clsx", "react-hot-toast"],
          query:    ["react-query"],
          dropzone: ["react-dropzone"],
          axios:    ["axios"],
        },
      },
    },
  },
});
