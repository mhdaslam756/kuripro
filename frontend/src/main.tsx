import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import "./index.css";
import { PwaStatus } from "./components/pwa/pwa-status";
import { AuthProvider } from "./lib/auth-context";
import { initPwa } from "./lib/pwa-runtime";
import { queryClient } from "./lib/query-client";
import { ThemeProvider } from "./lib/theme-context";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

// Register the service worker + capture the install prompt as early as possible.
initPwa();

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <PwaStatus />
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
