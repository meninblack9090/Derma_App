import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { subscribeToUserProfile, createUserProfile, getUserProfile } from '../firebase/firestore';

const AuthContext = createContext({});

/**
 * Attempt to auto-create a Firestore profile when the document is missing
 * but the user exists in Firebase Auth.
 */
async function ensureProfileExists(firebaseUser) {
  try {
    // Double-check with a one-time read first
    const existing = await getUserProfile(firebaseUser.uid);
    if (existing) {
      console.log('AuthContext: Profile already exists for', firebaseUser.uid);
      return existing;
    }

    // Profile truly missing — create it from Auth metadata
    console.warn('AuthContext: Profile missing in Firestore, auto-creating for', firebaseUser.uid);
    const email = firebaseUser.email || '';
    const displayName = firebaseUser.displayName || email.split('@')[0] || 'User';

    await createUserProfile(firebaseUser.uid, {
      displayName,
      email,
      role: 'patient', // default to patient; derma accounts always have profiles from signup
      plan: 'free',
      phone: '',
      gender: 'male',
    });

    console.log('AuthContext: Auto-created profile for', firebaseUser.uid);
    // Read back what we just wrote
    return await getUserProfile(firebaseUser.uid);
  } catch (err) {
    console.error('AuthContext: Failed to auto-create profile:', err?.message);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let profileUnsub = null;
    let timeoutId = null;
    let repairAttempted = false;

    const startProfileListener = (firebaseUser) => {
      profileUnsub = subscribeToUserProfile(
        firebaseUser.uid,
        async (userProfile) => {
          if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

          if (userProfile) {
            // Profile loaded successfully
            repairAttempted = false;
            
            // Default to 'patient' if an older profile is missing the role field
            if (!userProfile.role) {
              userProfile.role = 'patient';
            }

            setProfile(userProfile);
            setAuthLoading(false);
          } else if (!repairAttempted) {
            // Profile is null (document doesn't exist) — try to auto-create
            repairAttempted = true;
            console.warn('AuthContext: Profile snapshot returned null, attempting repair...');
            const repaired = await ensureProfileExists(firebaseUser);
            if (repaired) {
              // The onSnapshot listener will fire again with the new data
              console.log('AuthContext: Repair successful, waiting for snapshot update...');
            } else {
              // Repair failed — show error screen
              console.error('AuthContext: Repair failed, no profile available');
              setProfile(null);
              setAuthLoading(false);
            }
          } else {
            // Already tried repair and still null — give up
            setProfile(null);
            setAuthLoading(false);
          }
        },
        async (error) => {
          console.warn('AuthContext: Error loading profile:', error?.message);
          if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

          // On permission-denied, try a direct read + auto-create as fallback
          if (!repairAttempted) {
            repairAttempted = true;
            console.warn('AuthContext: Attempting fallback profile repair...');
            const repaired = await ensureProfileExists(firebaseUser);
            if (repaired) {
              setProfile(repaired);
              setAuthLoading(false);
              // Re-subscribe now that the doc exists
              if (profileUnsub) profileUnsub();
              startProfileListener(firebaseUser);
              return;
            }
          }

          setProfile(null);
          setAuthLoading(false);
        }
      );
    };

    const authUnsub = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      repairAttempted = false;

      // Clear any previous profile subscription & timeout
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (firebaseUser) {
        // Safety timeout — if profile never loads within 15s, stop loading
        timeoutId = setTimeout(() => {
          console.warn('AuthContext: Profile load timed out for uid', firebaseUser.uid);
          setAuthLoading(false);
        }, 15000);

        startProfileListener(firebaseUser);
      } else {
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth() — import and call this in any screen to get { user, profile, authLoading }
export const useAuth = () => useContext(AuthContext);
