import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // generateSW — plugin writes the entire service worker from config.
      // No sw.js source file needed; nothing for Rollup to resolve.
      strategies: "generateSW",

      registerType: "autoUpdate",   // new SW activates without user prompt

      // Where the generated SW is written (relative to outDir)
      filename: "sw.js",

      // Workbox config — what to precache and runtime cache
      workbox: {
        // Precache all built JS/CSS/HTML + public assets
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2,webp}"],

        // Runtime caching rules
        runtimeCaching: [
          {
            // API calls → Network First (8 s timeout), fallback to cache
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "lungdenoise-api-v1",
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts → Stale While Revalidate
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-v1",
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Any other cross-origin image/icon → Cache First
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "lungdenoise-images-v1",
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

        // Fallback to /index.html for all navigation requests (SPA routing)
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],

        // Clean up old caches automatically
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },

      // Web App Manifest — inlined here so the plugin handles injection
      manifest: {
        name:             "LungDenoise AI — CT Denoising",
        short_name:       "LungDenoise",
        description:      "Hospital-grade CT scan denoising: AGF + Haar Wavelet DWT + DnCNN + TV. Lung cancer diagnostic tool.",
        start_url:        "/",
        scope:            "/",
        display:          "standalone",
        orientation:      "any",
        background_color: "#0d7377",
        theme_color:      "#0d7377",
        lang:             "en",
        categories:       ["medical", "health", "productivity"],
        icons: [
          { src: "/icons/icon-72x72.png",            sizes: "72x72",   type: "image/png", purpose: "any" },
          { src: "/icons/icon-96x96.png",            sizes: "96x96",   type: "image/png", purpose: "any" },
          { src: "/icons/icon-128x128.png",          sizes: "128x128", type: "image/png", purpose: "any" },
          { src: "/icons/icon-144x144.png",          sizes: "144x144", type: "image/png", purpose: "any" },
          { src: "/icons/icon-152x152.png",          sizes: "152x152", type: "image/png", purpose: "any" },
          { src: "/icons/icon-192x192.png",          sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-384x384.png",          sizes: "384x384", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512x512.png",          sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "Upload CT Scan", short_name: "Ingest",
            description: "Upload a new DICOM or PNG CT scan",
            url: "/ingest",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
          },
          {
            name: "Denoise Pipeline", short_name: "Denoise",
            description: "Run the AGF + DWT + DnCNN denoising pipeline",
            url: "/denoise",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
          },
          {
            name: "Radiologist View", short_name: "Review",
            description: "Clinical review workstation",
            url: "/radiologist",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
          },
        ],
      },

      // Dev options — lets you test the install banner locally
      devOptions: {
        enabled:    true,
        type:       "module",
        navigateFallback: "/index.html",
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
        target:       process.env.VITE_API_URL || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir:    "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
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
