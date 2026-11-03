import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Check if a real, valid Firebase API key is configured
const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
export const isFirebaseConfigured: boolean = Boolean(
  rawApiKey &&
  rawApiKey !== 'undefined' &&
  typeof rawApiKey === 'string' &&
  !rawApiKey.includes('DummyKey') &&
  !rawApiKey.includes('YOUR_') &&
  !rawApiKey.includes(':') &&
  rawApiKey.length > 20
);

let appInstance: FirebaseApp;
let authInstance: Auth;
let firestoreInstance: Firestore;
let googleProviderInstance: GoogleAuthProvider;

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey: rawApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(appInstance);
    firestoreInstance = getFirestore(appInstance);
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.warn('[Noder] Firebase initialization failed; falling back to offline guest mode:', err);
    appInstance = {} as FirebaseApp;
    authInstance = { currentUser: null } as unknown as Auth;
    firestoreInstance = {} as Firestore;
    googleProviderInstance = { setCustomParameters: () => {} } as unknown as GoogleAuthProvider;
  }
} else {
  // Safe offline development stubs so module import never throws auth/invalid-api-key
  appInstance = {} as FirebaseApp;
  authInstance = { currentUser: null } as unknown as Auth;
  firestoreInstance = {} as Firestore;
  googleProviderInstance = { setCustomParameters: () => {} } as unknown as GoogleAuthProvider;
}

export const app = appInstance;
export const auth = authInstance;
export const firestore = firestoreInstance;
export const googleProvider = googleProviderInstance;
export default app;
