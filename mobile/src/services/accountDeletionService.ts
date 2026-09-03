/**
 * Hesap ve veri silme — istemci tarafı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE VARDI (v1.8.3 ve öncesi)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `authService.deleteAccount()`:
 *
 *     const user = auth.currentUser;
 *     if (user) await deleteUser(user);
 *
 * Bu fonksiyon **hiçbir yerden çağrılmıyordu** — uygulamada hesap silme yolu
 * yoktu. Google Play, hesap oluşturmaya izin veren uygulamalarda uygulama
 * İÇİNDE bir hesap silme yolu zorunlu tutuyor; bu tek başına yayın engeli.
 *
 * Çağrılsaydı daha kötüsü olurdu: Auth kaydı silinince `request.auth.uid` bir
 * daha var olmaz, ama `users/{uid}` alt ağacı Firestore'da kalır. Kurallar
 * erişimi `request.auth.uid`e bağladığı için o veriyi artık hiç kimse okuyup
 * silemez — ilaç listesi, doz geçmişi, bakıcı ilişkileri (özel nitelikli
 * sağlık verisi) sunucuda sonsuza kadar silinemez bir çöp olarak kalırdı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ŞİMDİ NE YAPIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Silme işini sunucudaki `deleteMyAccount` çağrılabilir fonksiyonuna
 * devrediyor (bkz. server/functions/deleteMyAccount.js). Sunucu sırayla:
 * `users/{uid}` alt ağacını özyinelemeli siler, `caregiverInvites` ve
 * `caregiverRelationships` içindeki iki taraflı kayıtları siler, EN SON Auth
 * kaydını siler.
 *
 * Ardından bu modül YEREL veriyi de temizler. Sıra burada da önemli: sunucu
 * başarısız olursa yerel veri KORUNUR, çünkü kullanıcı hâlâ giriş yapabilir
 * durumdadır ve verisini kaybetmemesi gerekir.
 */

import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('AccountDeletion');

/**
 * ⚠️ Bölge ZORUNLU. `getFunctions()` bölgesiz çağrıldığında varsayılan
 * `us-central1`e gider; fonksiyonlar `europe-west1`de. Bu tam olarak v1.7.4'te
 * yaşanan hataydı (bkz. aiMedicineService.ts) ve orada her AI çağrısı sessizce
 * NOT_FOUND'a düşüyordu. Burada sessiz düşme KABUL EDİLEMEZ: kullanıcı
 * "hesabım silindi" sanıp uygulamayı silerse verisi sunucuda kalır.
 */
const FUNCTIONS_REGION = 'europe-west1';

export interface AccountDeletionResult {
  success: boolean;
  /** Sunucunun sildiği kayıt sayıları (tanı için; kullanıcıya gösterilmez). */
  summary?: Record<string, number>;
}

/**
 * Sunucudaki silme fonksiyonunu çağırır.
 *
 * Hata durumunda ATAR — çağıran taraf yerel veriyi silmeden önce bunu
 * beklemek zorunda.
 */
export async function requestServerAccountDeletion(): Promise<AccountDeletionResult> {
  const functions = getFunctions(getApp(), FUNCTIONS_REGION);
  const callable = httpsCallable<Record<string, never>, AccountDeletionResult>(
    functions,
    'deleteMyAccount'
  );

  log.info('Sunucu tarafi hesap silme istegi gonderiliyor');

  const response = await callable({});
  const data = response.data;

  if (!data || data.success !== true) {
    // Sunucu "basarili" demediyse basarili SAYMIYORUZ. Aksi halde yerel
    // veriyi siler, kullanicinin elinde hicbir sey kalmaz ve bulutta her sey
    // durmaya devam eder — en kotu bilesim.
    throw new Error('Sunucu silme islemini onaylamadi');
  }

  log.info('Sunucu tarafi silme tamamlandi', { summary: data.summary });

  return data;
}
