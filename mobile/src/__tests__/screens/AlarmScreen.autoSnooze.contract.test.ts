/**
 * AlarmScreen auto-snooze — SÖZLEŞME TESTİ
 *
 * ── Neden bu test var ──────────────────────────────────────────────────────
 * v2.0.1 "Klinik Güvenlik & Pil Koruma Kalkanı — Auto-Snooze (3 Dakika)"
 * başlığıyla bir zamanlayıcı ekledi. Erteleme hakları tükendiğinde ve
 * kullanıcı 3 dakika yanıt vermediğinde alarmı durdurup ekranı kapatıyordu —
 * ama HİÇBİR DOZ KAYDI YAZMADAN.
 *
 * Sonuç SESSIZ KAÇIRILAN DOZ'du: yerel kayıt yok, bulut kaydı yok, bakıcı
 * uyarısı yok. Üstelik sonradan da onarılamıyordu, çünkü `markMissedReminders`
 * yalnızca BUGÜNÜ ve 60 dk grace ile dolduruyor — uygulama aynı gün bir daha
 * açılmazsa doz hiç kaydedilmiyordu. Bir hasta için en kötü senaryo: ilacını
 * almadı, kimse bilmiyor, kayıtta da yok.
 *
 * ── Neden kaynak-tarama kapısı, davranışsal test değil ─────────────────────
 * Efekt `if (isTestMode) return` ile korunuyor (test alarmı klinik yolu
 * tetiklemesin diye) ve `useAlarmController` navigasyon + route + dil + store
 * + ses + native modülleri çekiyor. Davranışsal test bu guard yüzünden yolu
 * hiç çalıştıramaz. Bu yüzden `firestoreRules.contract.test.ts` ve
 * `a11y.test.ts` ile aynı desen: kusurun GERİ GELMESİNİ engelleyen yapısal
 * değişmezler doğrulanır.
 *
 * Davranışsal garanti ise store seviyesinde test ediliyor:
 * `__tests__/stores/medicineStore.test.ts` → `describe('logMedicineMissed')`
 * (7 test: kullanıcının taken/skipped kararının üzerine yazmaz, yan etkileri
 * tekrarlamaz, takenAt koymaz).
 */

/* global __dirname */
import fs from 'fs';
import path from 'path';

const HOOK_PATH = path.join(
  __dirname,
  '..',
  '..',
  'screens',
  'AlarmScreen',
  'hooks',
  'useAlarmController.ts'
);
const STORE_PATH = path.join(__dirname, '..', '..', 'stores', 'medicineStore.ts');

const hookSource = fs.readFileSync(HOOK_PATH, 'utf8');
const storeSource = fs.readFileSync(STORE_PATH, 'utf8');

/**
 * Yorum satırlarını atar — kusuru ANLATAN yorumlar kusur sanılmasın.
 *
 * Bu özellikle önemli: auto-snooze bloğundaki yorum, v1.7.7 invariantı
 * gereği `logMedicineSkipped` ÇAĞRILMADIĞINI açıklıyor. Yorumlar
 * soyulmazsa "skipped yazmıyor" iddiası kendi açıklamamız yüzünden patlardı.
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const hook = stripComments(hookSource);

/** Auto-snooze efektinin gövdesini ve deps satırını çıkarır. */
function extractAutoSnoozeEffect(): { body: string; deps: string } {
  const anchor = hook.indexOf('AUTO_SNOOZE_TIMEOUT_MS');
  expect(anchor).toBeGreaterThan(-1);

  const effectStart = hook.lastIndexOf('useEffect(() => {', anchor);
  expect(effectStart).toBeGreaterThan(-1);

  const depsMatch = /\}, \[([^\]]*)\]\);/.exec(hook.slice(effectStart));
  expect(depsMatch).not.toBeNull();

  const bodyEnd = effectStart + (depsMatch?.index ?? 0);
  return {
    body: hook.slice(effectStart, bodyEnd),
    deps: (depsMatch?.[1] ?? '').replace(/\s+/g, ''),
  };
}

describe('useAlarmController — auto-snooze klinik değişmezleri', () => {
  const { body, deps } = extractAutoSnoozeEffect();

  it('erteleme hakları bittiğinde dozu `missed` olarak KAYDEDİYOR', () => {
    // v2.0.1'in orijinal hatası: bu çağrı hiç yoktu, alarm kayıtsız kapanıyordu.
    expect(body).toMatch(/logMissed\(/);
  });

  it('kayıt, alarmı kapatmadan ÖNCE yazılıyor', () => {
    // Sıra önemli: dismiss() ekranı/store'u kapattıktan sonra yazılan kayıt
    // yarışa girer. Önce kayıt, sonra ses/bildirim/ekran kapanışı.
    const recordAt = body.indexOf('logMissed(');
    const dismissAt = body.indexOf('dismiss()');
    expect(recordAt).toBeGreaterThan(-1);
    expect(dismissAt).toBeGreaterThan(-1);
    expect(recordAt).toBeLessThan(dismissAt);
  });

  it('⚠️ otomatik kapanışta `skipped` YAZMIYOR (v1.7.7 invariantı)', () => {
    // `skipped` doktora giden uyum raporuna yazılan KLİNİK BİR KARARDIR ve
    // yalnızca kullanıcı açıkça seçerse yazılmalıdır. Otomatik yollar
    // `missed` (bir sonuç) yazar, `skipped` (bir karar) değil.
    expect(body).not.toMatch(/logMedicineSkipped/);
    expect(body).not.toMatch(/logSkipped/);
  });

  it('zamanlayıcı güncel değerleri ref üzerinden okuyor (bayat closure değil)', () => {
    // v2.0.1'de deps [canSnooze, isTestMode] idi ama gövde handleSnooze /
    // stopAlarmAudio / dismissAlarm kapatıyordu → zamanlayıcı bayat closure
    // çalıştırıyordu.
    expect(body).toMatch(/autoSnoozeRef\.current/);
  });

  it("deps yalnızca [isTestMode] — geri sayım her render'da sıfırlanmıyor", () => {
    // `handleSnooze` useCallback DEĞİL ve `scheduledTime` route'ta yoksa her
    // render yeniden üretilen bir varsayılan. Bunları deps'e koymak 3 dakikalık
    // geri sayımı sürekli baştan başlatır ve auto-snooze HİÇ tetiklenmez.
    expect(deps).toBe('isTestMode');
  });

  it('deps arasında `canSnooze` veya `handleSnooze` YOK', () => {
    expect(deps).not.toContain('canSnooze');
    expect(deps).not.toContain('handleSnooze');
  });

  it("`logMedicineMissed` store'dan çözülüyor (kablolama mevcut)", () => {
    expect(hook).toMatch(/logMedicineMissed,/);
  });

  it('store `logMedicineMissed` aksiyonunu gerçekten tanımlıyor', () => {
    const store = stripComments(storeSource);
    expect(store).toMatch(/logMedicineMissed:\s*\(reminderTimeId/);
    // Aksiyon 'missed' statüsüyle log üretmeli.
    expect(store).toMatch(/_createMedicineLog\(\s*'missed'/);
  });
});
