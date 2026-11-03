import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';

const GUEST_STORAGE_KEY = 'noder_guest_session';

// Helper to create a consistent mock user for local offline/guest sessions
const createMockUser = (name = 'Local Architect', email = 'architect@noder.local'): User => {
  return {
    uid: 'guest_local_user',
    email,
    displayName: name,
    photoURL: null,
    emailVerified: true,
    isAnonymous: true,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'mock-dev-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'noder-local',
  } as unknown as User;
};

// Interface for the authentication context
interface AuthContextProps {
  currentUser: User | null;
  loading: boolean;
  isGuestUser: boolean;
  isFirebaseConfigured: boolean;
  loginAsGuest: (name?: string, email?: string) => void;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuestUser, setIsGuestUser] = useState(false);

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string): Promise<void> => {
    if (!isFirebaseConfigured) {
      loginAsGuest(name || email.split('@')[0], email);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name
        });
      }
      setIsGuestUser(false);
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  // Log in with email and password
  const login = async (email: string, password: string): Promise<void> => {
    if (!isFirebaseConfigured) {
      loginAsGuest(email.split('@')[0], email);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsGuestUser(false);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  // Log in with Google
  const loginWithGoogle = async (): Promise<void> => {
    if (!isFirebaseConfigured) {
      loginAsGuest('Google Demo Architect', 'architect.demo@noder.local');
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
      setIsGuestUser(false);
    } catch (error) {
      console.error('Error logging in with Google:', error);
      throw error;
    }
  };

  // Quick 1-click guest / offline login
  const loginAsGuest = (name = 'Local Architect', email = 'architect@noder.local') => {
    const guestUser = createMockUser(name, email);
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ name, email }));
    setCurrentUser(guestUser);
    setIsGuestUser(true);
    setLoading(false);
  };

  // Log out
  const logout = async (): Promise<void> => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    setIsGuestUser(false);
    setCurrentUser(null);

    if (isFirebaseConfigured) {
      try {
        await signOut(auth);
      } catch (error) {
        console.warn('Firebase logout warning:', error);
      }
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (displayName: string, photoURL?: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('No user is signed in');
    }

    if (isGuestUser || !isFirebaseConfigured) {
      const updated = {
        ...currentUser,
        displayName,
        ...(photoURL && { photoURL })
      } as User;
      setCurrentUser(updated);
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ name: displayName, email: currentUser.email }));
      return;
    }

    try {
      await updateProfile(currentUser, {
        displayName,
        ...(photoURL && { photoURL })
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // Monitor auth state changes & restore local guest session
  useEffect(() => {
    // Check local guest session first
    const savedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
    if (savedGuest) {
      try {
        const parsed = JSON.parse(savedGuest);
        setCurrentUser(createMockUser(parsed.name, parsed.email));
        setIsGuestUser(true);
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }
    }

    if (!isFirebaseConfigured) {
      // If Firebase credentials are not provided, auto-enable guest mode by default
      loginAsGuest();
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsGuestUser(false);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextProps = {
    currentUser,
    loading,
    isGuestUser,
    isFirebaseConfigured,
    loginAsGuest,
    signUp,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
