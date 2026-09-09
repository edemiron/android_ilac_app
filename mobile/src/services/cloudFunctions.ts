/**
 * Cloud Functions istemci kapısı — TEK kaynak.
 *
 * ── Neden ayrı modül ──────────────────────────────────────────────────────
 * `getFunctions()` BÖLGESİZ çağrıldığında varsayılan `us-central1`'e gider;
 * bu projenin fonksiyonları ise `europe-west1`'de deploy ediliyor. Sonuç
 * her çağrının NOT_FOUND ile düşmesiydi ve v1.7.4 öncesinde `aiMedicineService`
 * bu hatayı "fallback" olarak APK'ya gömülü API anahtarıyla doğrudan
 * Google'a giderek "telafi" ediyordu — yani "anahtarlar sunucuda kalır"
 * yorumu pratikte hiç doğru olmamıştı.
 *
 * Bölge sabitinin her serviste ayrı kopyalanması bu hatayı tekrar üretmeye
 * açık. Tek modülde tutuluyor; yeni bir callable eklerken burayı kullanın,
 * `getFunctions`'ı doğrudan çağırmayın.
 */

import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';

/** Fonksiyonların deploy edildiği bölge — `firebase.json` / CLI ile aynı olmalı. */
export const FUNCTIONS_REGION = 'europe-west1';

let functionsInstance: Functions | null = null;

export function getFunctionsInstance(): Functions {
  if (!functionsInstance) {
    functionsInstance = getFunctions(getApp(), FUNCTIONS_REGION);
  }
  return functionsInstance;
}

/**
 * Bir callable'ı çağırır ve `response.data`'yı tipli döndürür.
 *
 * Hataları YUTMAZ — fırlatır. Çağıran taraf `error.code` üzerinden
 * (`unauthenticated`, `permission-denied`, `resource-exhausted`,
 * `failed-precondition`, `unavailable`, `internal`) kullanıcıya uygun mesajı
 * seçmeli; generic bir "başarısız" mesajı hem teşhisi zorlaştırır hem de
 * örn. kota aşımını ağ hatasından ayırt edilemez hale getirir.
 */
export async function callFunction<TParams, TResult>(
  name: string,
  params: TParams
): Promise<TResult> {
  const callable = httpsCallable<TParams, TResult>(getFunctionsInstance(), name);
  const response = await callable(params);
  return response.data;
}
