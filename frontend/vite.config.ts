import { fileURLToPath } from "node:url";

import basicSsl from "@vitejs/plugin-basic-ssl";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    basicSsl(), // Enables HTTPS in dev — required for Web Push (PushManager) on mobile/local network
    react(),
    tailwindcss(),
    VitePWA({
      // We ship a hand-written service worker (Background Sync + push + offline shell), so vite-plugin-pwa
      // only injects the precache manifest into it rather than generating the whole worker.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 5_000_000,
      },
      manifest: {
        name: "KuriPro — Chit Fund Manager",
        short_name: "KuriPro",
        description: "Run your chit funds — collections, auctions, payouts and reports — on any device, even offline.",
        theme_color: "#102d30",
        background_color: "#f7f8f6",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        categories: ["finance", "business"],
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  server: {
    // Expose to all network interfaces so mobile devices on the same Wi-Fi can reach the dev server.
    // Combined with basicSsl() above, this gives https://192.168.x.x:5173 — a secure context
    // that unlocks the Web Push API (PushManager) on Android Chrome.
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
