import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from "@/context/app-context";
import { registerServiceWorker, setupInstallPrompt } from "./lib/pwa";

// Enable Eruda (mobile debugging console) with ?debug=true in URL
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('debug') === 'true' || import.meta.env.DEV) {
  import('eruda').then(eruda => eruda.default.init());
}

// Register Service Worker for PWA
if (import.meta.env.PROD) {
  registerServiceWorker();
  setupInstallPrompt();
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <App />
        <Toaster />
      </AppProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
