import { auth } from './config';
import { createUserProfile, getUserProfile } from './firestore';

export { auth };

// ─── Patient sign up ──────────────────────────────────────────────────────────
export const signUpPatient = async ({ name, email, password, phone, gender }) => {
  const { user } = await auth.createUserWithEmailAndPassword(email, password);
  await user.updateProfile({ displayName: name });
  await createUserProfile(user.uid, {
    displayName: name,
    email,
    role: 'patient',
    plan: 'free',
    phone: phone || '',
    gender: gender || 'male',
  });
  return user;
};

// ─── Derma sign up ────────────────────────────────────────────────────────────
export const signUpDerma = async ({ name, email, password, phone, gender, specialty, licenseNumber, clinic }) => {
  const { user } = await auth.createUserWithEmailAndPassword(email, password);
  await user.updateProfile({ displayName: name });
  await createUserProfile(user.uid, {
    displayName: name,
    email,
    role: 'derma',
    phone: phone || '',
    gender: gender || 'male',
    specialty: specialty || '',
    licenseNumber: licenseNumber || '',
    clinic: clinic || '',
    verified: false,
    rating: 0,
  });
  return user;
};

// ─── Sign in (patient or derma) ───────────────────────────────────────────────
export const signInUser = async (email, password) => {
  const { user } = await auth.signInWithEmailAndPassword(email, password);
  return user;
};

// ─── Derma sign in — verifies the account has role === 'derma' ────────────────
export const signInDerma = async (email, password) => {
  const { user } = await auth.signInWithEmailAndPassword(email, password);
  const profile = await getUserProfile(user.uid);
  if (profile?.role !== 'derma') {
    await auth.signOut();
    throw new Error('This account is not registered as a dermatologist.');
  }
  return user;
};

// ─── Sign out ─────────────────────────────────────────────────────────────────
export const logOut = () => auth.signOut();

// ─── Password reset email ─────────────────────────────────────────────────────
export const resetPassword = (email) => auth.sendPasswordResetEmail(email);
