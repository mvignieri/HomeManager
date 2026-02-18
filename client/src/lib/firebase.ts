import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "demo-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
};

// Check if Firebase is properly configured
if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  console.error('❌ Firebase not configured - missing environment variables');
  console.error('VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY ? 'present' : 'MISSING');
  console.error('VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'present' : 'MISSING');
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firebase Cloud Messaging
let messaging: ReturnType<typeof getMessaging> | null = null;

export const initializeMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      return messaging;
    }
    console.log('Firebase Messaging not supported in this browser');
    return null;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
};

export const getMessagingInstance = () => messaging;

// Get FCM token
export const getFCMToken = async (vapidKey?: string): Promise<string | null> => {
  try {
    if (!messaging) {
      await initializeMessaging();
    }

    if (!messaging) {
      return null;
    }

    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey || import.meta.env.VITE_FIREBASE_VAPID_KEY
    });

    if (currentToken) {
      console.log('FCM Token obtained:', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = (callback: (payload: any) => void) => {
  if (!messaging) {
    console.error('Messaging not initialized');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    callback(payload);
  });
};

// Configure Google Auth provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

// Sign in with Google using popup
export const signInWithGoogle = async () => {
  try {
    console.warn('🔵 Firebase: Starting Google sign-in with popup');
    const result = await signInWithPopup(auth, provider);
    console.warn('🟢 Firebase: Sign-in successful:', result.user.email);
    return result.user;
  } catch (error: any) {
    console.error("🔴 Firebase: Error signing in with Google:", error.code, error.message);
    throw error;
  }
};

// Handle redirect result after returning from Google sign-in
export const handleRedirectResult = async () => {
  try {
    console.warn('🔵 Firebase: Checking redirect result...');
    console.warn('🔵 Firebase: Current user before getRedirectResult:', auth.currentUser?.email || 'none');

    const result = await getRedirectResult(auth);

    console.warn('🔵 Firebase: getRedirectResult returned:', result ? 'result found' : 'null');
    console.warn('🔵 Firebase: Current user after getRedirectResult:', auth.currentUser?.email || 'none');

    if (result) {
      console.warn('🟢 Firebase: User signed in via redirect:', result.user.email);
      return result.user;
    }
    return null;
  } catch (error: any) {
    console.error("🔴 Firebase: Error handling redirect result:", error.code, error.message);
    throw error;
  }
};

// Sign out
export const signOut = () => {
  return auth.signOut();
};

export default auth;
