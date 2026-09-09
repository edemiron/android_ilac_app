import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
  // v1.8.4: `deleteUser` import'u KALDIRILDI. Auth kaydini istemciden silmek,
  // Firestore'daki saglik verisini ULASILAMAZ halde birakiyordu (bkz.
  // asagidaki deleteAccount yorumu). Silme artik sunucuda.
  GoogleAuthProvider,
  signInWithCredential,
  signInAnonymously,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';
// v1.8.6: Google web client ID'nin dogru degeri app.json'da; bkz. asagidaki
// blok. Elle yazilmis varsayilan YANLIS PROJEYE isaret ediyordu.
import Constants from 'expo-constants';
// Hesap silmenin TEK kapisi (bkz. deleteAccount yorumu).
import { requestServerAccountDeletion } from './accountDeletionService';

/**
 * Google Sign-In web client ID.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ v1.8.6 — GOOGLE ILE GIRIS ÇALIŞMIYORDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Buradaki varsayılan şu değerdi:
 *
 *     '708668760763-2ta9pf3rrtn8cg7ihf16tsct42e06mq6.apps.googleusercontent.com'
 *
 * Baştaki sayı GCP **proje numarasıdır** ve bu projenin Firebase projesi
 * `506876057044` (bkz. `android/app/google-services.json` →
 * `project_info.project_number`). Yani varsayılan, **başka bir Google Cloud
 * projesine** ait bir client ID'ydi.
 *
 * Sonuç: `GoogleSignin` o client ID ile bir kimlik belirteci (ID token)
 * alıyor, belirtecin `aud` alanı o YABANCI projeyi gösteriyor, ardından
 * `signInWithCredential` bu belirteci `506876057044` projesine sunuyor ve
 * Firebase audience uyuşmazlığı nedeniyle reddediyor. "Google ile devam et"
 * düğmesi hiçbir zaman çalışmamış olmalı.
 *
 * Varsayılanın hiç kullanılmadığı da varsayılamaz: değer
 * `Config.GOOGLE_WEB_CLIENT_ID || DEFAULT` şeklinde okunuyor ve
 * `react-native-config`in okuduğu `mobile/.env` dosyası **BOŞ**
 * (dosya var, içinde tek bir `KEY=value` satırı yok). Yani gerçekte
 * her zaman bu yanlış varsayılan kullanılıyordu.
 *
 * ── DOĞRU DEĞER NEREDE ────────────────────────────────────────────────────
 * `google-services.json` içindeki `oauth_client` listesinde
 * `client_type: 3` (web) olan giriş:
 *   506876057044-a1dse18hnemqnceocge898ejfp6q8sra.apps.googleusercontent.com
 * `app.json` → `extra.google.webClientId` de zaten bu değeri taşıyordu.
 * Yani doğru değer depoda İKİ YERDE duruyordu; kod üçüncü, yanlış bir
 * kopyayı kullanıyordu.
 *
 * Bu yüzden artık `app.json`daki değer okunuyor ve
 * `src/__tests__/config/googleSignIn.test.ts` onun `google-services.json`
 * ile eşleştiğini doğruluyor. Elle yazılmış varsayılan KALDIRILDI: yanlış
 * bir varsayılan, hiç varsayılan olmamasından kötü — sessizce yanlış
 * projeye gidiyor.
 */
const WEB_CLIENT_ID_FROM_APP_CONFIG = (
  Constants.expoConfig?.extra as { google?: { webClientId?: string } } | undefined
)?.google?.webClientId;

function resolveWebClientId(): string {
  const fromEnv = Config.GOOGLE_WEB_CLIENT_ID;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();

  if (WEB_CLIENT_ID_FROM_APP_CONFIG) return WEB_CLIENT_ID_FROM_APP_CONFIG;

  // Buraya dusmek yapilandirma hatasidir. SESSIZ kalmiyoruz: eskiden yanlis
  // bir sabit devreye girip girisi sessizce bozuyordu.
  throw new Error(
    'Google web client ID bulunamadi: ne GOOGLE_WEB_CLIENT_ID ne app.json extra.google.webClientId tanimli'
  );
}

// Google Sign-In yapılandırması
let isGoogleConfigured = false;

export function configureGoogleSignIn(): void {
  if (isGoogleConfigured) return;

  GoogleSignin.configure({
    webClientId: resolveWebClientId(),
    offlineAccess: true,
  });
  isGoogleConfigured = true;
}

/**
 * Google OAuth Client ID'leri.
 *
 * NOT: `androidClientId` eskiden `DEFAULT_GOOGLE_WEB_CLIENT_ID`e (yani bir
 * WEB client ID'ye, hem de yanlis projenin) dusuyordu. Android client ID ile
 * web client ID ayri seylerdir; Android olanini `google-services.json`
 * `client_type: 1` girisi tasiyor. Android tarafinda `GoogleSignin` yalnizca
 * `webClientId` istiyor, bu yuzden `androidClientId` yalnizca app.json'dan
 * okunuyor ve yoksa bos kaliyor — uydurma bir deger vermek yerine.
 */
export const GOOGLE_CLIENT_ID = {
  androidClientId:
    Config.GOOGLE_ANDROID_CLIENT_ID ||
    (Constants.expoConfig?.extra as { google?: { androidClientId?: string } } | undefined)?.google
      ?.androidClientId ||
    '',
  get webClientId(): string {
    return resolveWebClientId();
  },
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
  } catch (error: unknown) {
    const authError = error as { code?: string };
    throw translateAuthError(authError.code || 'unknown');
  }
}

// Email ile giriş
export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  } catch (error: unknown) {
    const authError = error as { code?: string };
    throw translateAuthError(authError.code || 'unknown');
  }
}

// Kullanıcı adını (displayName) güncelle
export async function updateUserDisplayName(displayName: string): Promise<AuthUser> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Oturum açmış kullanıcı bulunamadı.');
    }

    const trimmed = displayName.trim();
    if (!trimmed) {
      throw new Error('Kullanıcı adı boş olamaz.');
    }

    // 1. Firebase Auth profilini güncelle
    await updateProfile(currentUser, { displayName: trimmed });
    await currentUser.reload();

    // 2. Firestore users koleksiyonunu güncelle (varsa)
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(
        userRef,
        {
          displayName: trimmed,
          name: trimmed,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (_firestoreErr) {
      // Offline or error - ignore
    }

    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: trimmed,
      photoURL: currentUser.photoURL,
    };
  } catch (error: unknown) {
    const authError = error as { code?: string; message?: string };
    if (authError.code) {
      throw translateAuthError(authError.code);
    }
    throw error;
  }
}

// Misafir / Anonim Giriş
export async function loginAnonymously(): Promise<AuthUser> {
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;

    return {
      uid: user.uid,
      email: null,
      displayName: 'Misafir Kullanıcı',
      photoURL: null,
    };
  } catch (error: unknown) {
    const authError = error as { code?: string };
    throw translateAuthError(authError.code || 'unknown');
  }
}

// Çıkış yap
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: unknown) {
    const authError = error as { code?: string };
    throw translateAuthError(authError.code || 'unknown');
  }
}

// Şifre sıfırlama
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    const authError = error as { code?: string };
    throw translateAuthError(authError.code || 'unknown');
  }
}

/**
 * Hesap silme.
 *
 * ⚠️ v1.8.4 — BU FONKSİYON YALNIZCA AUTH KAYDINI SİLİYORDU ve hiçbir yerden
 * çağrılmıyordu. Çağrılsaydı Firestore'daki `users/{uid}` alt ağacı yerinde
 * kalacaktı; kurallar erişimi `request.auth.uid`e bağladığı için o sağlık
 * verisi bir daha HİÇ KİMSE tarafından okunamaz ve silinemez hâle gelecekti.
 *
 * Artık silme işi tek bir yerden yürüyor: sunucudaki `deleteMyAccount`
 * çağrılabilir fonksiyonu (bkz. `services/accountDeletionService.ts` ve
 * `server/functions/deleteMyAccount.js`). O fonksiyon Auth kaydını EN SON
 * siler, böylece herhangi bir adımda kesinti olsa bile kullanıcı hâlâ giriş
 * yapıp yeniden deneyebilir.
 *
 * Bu sarmalayıcı geriye dönük uyumluluk için duruyor ve doğrudan
 * `deleteUser` çağırmıyor.
 */
export async function deleteAccount(): Promise<void> {
  // STATIK import: dinamik `import()` babel tarafindan oldugu gibi
  // birakiliyor ve jest onu araya girip mock'layamiyor
  // (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG). Bu yol test edilmek
  // ZORUNDA, o yuzden statik.
  await requestServerAccountDeletion();
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
export function subscribeToAuthChanges(callback: (user: AuthUser | null) => void): () => void {
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
  } catch (error: unknown) {
    const authError = error as { code?: string };
    throw translateAuthError(authError.code || 'unknown');
  }
}

// Google ile native sign-in (tam akış)
export async function signInWithGoogleNative(): Promise<AuthUser> {
  try {
    // Yapılandırmayı kontrol et
    configureGoogleSignIn();

    // Play services kontrolü
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Google Sign-In başlat
    const response = await GoogleSignin.signIn();

    if (isSuccessResponse(response)) {
      const { idToken } = response.data;

      if (!idToken) {
        throw new Error('Google Sign-In başarısız: ID token alınamadı');
      }

      // Firebase ile giriş yap
      return await loginWithGoogle(idToken);
    } else {
      throw new Error('Google Sign-In iptal edildi');
    }
  } catch (error: unknown) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new Error('Google girişi iptal edildi.');
        case statusCodes.IN_PROGRESS:
          throw new Error('Google girişi zaten devam ediyor.');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Google Play Services yüklü değil veya güncel değil.');
        default:
          throw new Error(`Google giriş hatası: ${error.message}`);
      }
    }
    throw error;
  }
}

// Google oturumunu kapat
export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Sessizce yoksay - zaten çıkış yapılmış olabilir
  }
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
      tr: "Firebase yapılandırması bulunamadı. Lütfen Firebase Console'dan Email/Password sign-in yöntemini etkinleştirin.",
      en: 'Firebase configuration not found. Please enable Email/Password sign-in in Firebase Console.',
    },
  };

  const message = errorMessages[errorCode]?.tr || `Bir hata oluştu: ${errorCode}`;
  return new Error(message);
}
