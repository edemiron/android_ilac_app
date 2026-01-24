import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Web browser session'ı tamamla
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
// Bu değerleri Google Cloud Console'dan almalısınız
export const GOOGLE_CLIENT_ID = {
  androidClientId: '506876057044-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
  webClientId: '506876057044-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
};

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Kullanıcı kaydı
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUser> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Kullanıcı adını güncelle
    if (displayName) {
      await updateProfile(user, { displayName });
      // Profil güncellendikten sonra user'ı yenile (onAuthStateChanged'ın güncel veriyi alması için)
      await user.reload();
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName,
      photoURL: user.photoURL,
    };
  } catch (error: any) {
    throw translateAuthError(error.code);
  }
}

// Email ile giriş
export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  } catch (error: any) {
    throw translateAuthError(error.code);
  }
}

// Çıkış yap
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw translateAuthError(error.code);
  }
}

// Şifre sıfırlama
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw translateAuthError(error.code);
  }
}

// Hesap silme
export async function deleteAccount(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (user) {
      await deleteUser(user);
    }
  } catch (error: any) {
    throw translateAuthError(error.code);
  }
}

// Mevcut kullanıcıyı al
export function getCurrentUser(): AuthUser | null {
  const user = auth.currentUser;
  if (!user) return null;

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

// Auth durumu değişikliklerini dinle
export function subscribeToAuthChanges(
  callback: (user: AuthUser | null) => void
): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else {
      callback(null);
    }
  });
}

// Google ile giriş yap
export async function loginWithGoogle(idToken: string): Promise<AuthUser> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  } catch (error: any) {
    throw translateAuthError(error.code);
  }
}

// Google Auth hook'u için config
export function useGoogleAuth() {
  return Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

// Firebase hata kodlarını Türkçe'ye çevir
function translateAuthError(errorCode: string): Error {
  const errorMessages: Record<string, { tr: string; en: string }> = {
    'auth/email-already-in-use': {
      tr: 'Bu e-posta adresi zaten kullanılıyor.',
      en: 'This email is already in use.',
    },
    'auth/invalid-email': {
      tr: 'Geçersiz e-posta adresi.',
      en: 'Invalid email address.',
    },
    'auth/weak-password': {
      tr: 'Şifre en az 6 karakter olmalıdır.',
      en: 'Password must be at least 6 characters.',
    },
    'auth/user-not-found': {
      tr: 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.',
      en: 'No user found with this email.',
    },
    'auth/wrong-password': {
      tr: 'Yanlış şifre.',
      en: 'Wrong password.',
    },
    'auth/too-many-requests': {
      tr: 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.',
      en: 'Too many failed attempts. Please try again later.',
    },
    'auth/network-request-failed': {
      tr: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
      en: 'Network error. Check your internet connection.',
    },
    'auth/invalid-credential': {
      tr: 'E-posta veya şifre hatalı.',
      en: 'Invalid email or password.',
    },
    'auth/configuration-not-found': {
      tr: 'Firebase yapılandırması bulunamadı. Lütfen Firebase Console\'dan Email/Password sign-in yöntemini etkinleştirin.',
      en: 'Firebase configuration not found. Please enable Email/Password sign-in in Firebase Console.',
    },
  };

  const message = errorMessages[errorCode]?.tr || `Bir hata oluştu: ${errorCode}`;
  return new Error(message);
}
