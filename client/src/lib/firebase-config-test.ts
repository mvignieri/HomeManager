import { initializeApp } from "firebase/app";

// Get Firebase config values from environment
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

// Log values (not the actual credentials, just whether they exist)
console.log("Firebase config check:");
console.log("API key exists:", !!apiKey);
console.log("Project ID exists:", !!projectId);
console.log("App ID exists:", !!appId);

const firebaseConfig = {
  apiKey,
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: `${projectId}.appspot.com`,
  appId,
};

// Check Firebase initialization
try {
  const app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully:", !!app);
} catch (error: any) {
  console.error("Firebase initialization error:", error.message);
}