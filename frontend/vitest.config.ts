import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// A dedicated Vitest config (no VitePWA plugin) so tests run in a clean jsdom environment.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // vite-plugin-pwa's virtual module isn't present under Vitest — resolve it to a stub.
      "virtual:pwa-register": fileURLToPath(new URL("./tests/stubs/pwa-register.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    css: false,
  },
});
