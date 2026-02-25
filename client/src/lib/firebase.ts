import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";

const GCAL_TOKEN_KEY = 'gcal_token';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

// Bump this string whenever you add new OAuth scopes to the Google provider.
// Any session created with an older version will be force-logged-out on next
// app load so the user re-authenticates and grants the new scopes.
export const REQUIRED_AUTH_VERSION = 'v2-gcal';
export const AUTH_VERSION_KEY = 'authVersion';

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

// Configure Google Auth provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
// Request Calendar read-only scope at login time so the token is
// immediately available without a second auth popup.
provider.addScope(GCAL_SCOPE);

// Sign in with Google using popup
export const signInWithGoogle = async () => {
  // Pre-set the auth version BEFORE the popup opens.
  // onAuthStateChanged fires during the popup flow; if the version key isn't
  // already present it would see a mismatch and force-logout the new session,
  // causing the first login attempt to silently fail.
  localStorage.setItem(AUTH_VERSION_KEY, REQUIRED_AUTH_VERSION);

  try {
    console.warn('🔵 Firebase: Starting Google sign-in with popup');
    const result = await signInWithPopup(auth, provider);
    console.warn('🟢 Firebase: Sign-in successful:', result.user.email);

    // Extract the Google OAuth access token (includes calendar.readonly scope)
    // and store it so useGoogleCalendar can use it immediately.
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      sessionStorage.setItem(GCAL_TOKEN_KEY, credential.accessToken);
      console.warn('🟢 Firebase: Google Calendar token stored');
    }

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
