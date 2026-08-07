import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Central Firebase init. All Firebase config values here are public
// identifiers, not secrets -- Google designs them to be exposed in
// client bundles. Real protection comes from the Workspace-only OAuth
// consent screen configuration (done in the Firebase Console, not in
// code) and the hd parameter set below. See the Google Sign-In design
// spec, "Security" section.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const WORKSPACE_DOMAIN = import.meta.env.VITE_WORKSPACE_DOMAIN || "ossastudio.com";

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ hd: WORKSPACE_DOMAIN });
