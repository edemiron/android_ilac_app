/* global __dirname */
/**
 * Cloud Functions sır yönetimi — KAPI TESTİ (v1.9.0).
 *
 * ── Neden bu test var ─────────────────────────────────────────────────────
 * Bu kusur zaten bir kez sessizce geri geldi. Zincir şöyleydi:
 *
 *   1. Anahtar Firestore `config/ai` dokümanındaydı ve `firestore.rules` onu
 *      `allow read: if true` ile açıyordu — KİMLİK DOĞRULAMASI YOKTU.
 *   2. v1.7.4 turu bunu düzeltti ve commit başlığına
 *      "anahtarlar Secret Manager'a taşındı" yazdı.
 *   3. Ama kod `process.env.GEMINI_API_KEY` okumaya DEVAM ETTİ. Gerçekte
 *      Secret Manager'a hiç geçilmemişti; yalnızca Firestore'dan `.env`e
 *      taşınmıştı. Başlık doğru işi anlatıyordu, kod başka iş yapıyordu ve
 *      bunu söyleyen hiçbir kapı yoktu.
 *
 * v1.9.0 geçişi gerçekten yaptı. Bu test, üçüncü adımın bir daha
 * olmamasını sağlıyor: iddia "başlıkta ne yazdığı" değil, KODUN NE OKUDUĞU.
 *
 * Emülatör gerektirmez — kaynak dosyayı okuyup yapısal değişmezleri kontrol
 * eder. `notifyAuthorization.test.ts` ile aynı desen.
 */

import fs from 'fs';
import path from 'path';

const FUNCTIONS_DIR = path.join(__dirname, '..', '..', '..', '..', 'server', 'functions');
const INDEX_PATH = path.join(FUNCTIONS_DIR, 'index.js');
const source = fs.readFileSync(INDEX_PATH, 'utf8');

/** Yorumları atar — kusuru ANLATAN yorumlar kusur sanılmasın. */
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const code = stripComments(source);

/** Sır sayılan parametre adları. */
const SECRET_NAMES = ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY'];

describe("Cloud Functions — sırlar Secret Manager'dan geliyor", () => {
  it('kaynak dosya gerçekten okundu (kapı boşa düşmesin)', () => {
    expect(source.length).toBeGreaterThan(2000);
    expect(code).toContain('exports.geminiGenerate');
  });

  it.each(SECRET_NAMES)('%s `process.env` ile OKUNMUYOR', name => {
    // Tam olarak eski kusurun sekli: const X = process.env.X
    const viaEnv = new RegExp(`process\\.env\\.${name}\\b`);

    expect(code).not.toMatch(viaEnv);
  });

  it.each(SECRET_NAMES)('%s `defineSecret` ile tanimlanmis', name => {
    const declared = new RegExp(`defineSecret\\(\\s*['"\`]${name}['"\`]\\s*\\)`);

    expect(code).toMatch(declared);
  });

  it('hicbir sir MODUL KAPSAMINDA `.value()` ile okunmuyor', () => {
    /**
     * NEDEN: `defineSecret(...).value()` yalnizca istek isleyicisinin ICINDE
     * gecerli. Modul kapsaminda cagirmak deploy analizi sirasinda BOS deger
     * dondurur; fonksiyon calisir ama "yapilandirilmamis" diye 'unavailable'
     * atar. Sessiz ve teshisi zor bir kusur — o yuzden yapisal olarak
     * yasaklaniyor.
     *
     * Kural: `.value()` iceren her satir en az bir seviye girintili olmali
     * (yani bir fonksiyon govdesinin icinde).
     */
    const offenders = code
      .split('\n')
      .map((line, i) => ({ line, no: i + 1 }))
      .filter(({ line }) => /\.value\(\)/.test(line))
      .filter(({ line }) => !/^\s{2,}/.test(line));

    expect(offenders.map(o => `${o.no}: ${o.line.trim()}`)).toEqual([]);
  });

  it('sir kullanan HER fonksiyon onu `secrets:` ile ilan ediyor', () => {
    /**
     * Firebase, `secrets:` listesinde ilan EDILMEYEN bir sirri fonksiyona
     * baglamaz. Ilan etmeden `.value()` cagirmak calisma aninda bos deger
     * demek. Bu yuzden ilan ve kullanim BIRLIKTE dogrulanir.
     */
    const handlers = [
      { name: 'geminiSearch', secret: 'geminiApiKey' },
      { name: 'geminiGenerate', secret: 'geminiApiKey' },
      { name: 'claudeSearch', secret: 'anthropicApiKey' },
    ];

    for (const { name, secret } of handlers) {
      const declaration = new RegExp(
        `exports\\.${name}\\s*=\\s*onCall\\(\\s*\\{[^}]*secrets:\\s*\\[[^\\]]*\\b${secret}\\b`
      );
      expect(code).toMatch(declaration);
    }
  });

  it('`.env` dosyasi artik sir KAYNAGI degil (varsa yalnizca yorum tasir)', () => {
    const envPath = path.join(FUNCTIONS_DIR, '.env');
    if (!fs.existsSync(envPath)) {
      // Gecis tamamlanmis: dosya silinmis. Istenen son hal.
      expect(true).toBe(true);
      return;
    }

    // Dosya hala duruyorsa, en azindan "artik okunmuyor" uyarisini tasimali;
    // yani birileri onu canli yapilandirma sanip guncellemeye devam etmesin.
    const env = fs.readFileSync(envPath, 'utf8');
    expect(env).toMatch(/ARTIK OKUNMUYOR/);
  });
});
