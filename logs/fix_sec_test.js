/* eslint-disable */
// Faz 0.6 — silinen healthVaultCrypto'ya dayanan test blogunu kaldir.
const fs = require('fs');
const p =
  'C:/Users/digienes/Documents/ila_v8_agy_cmd/mobile/src/__tests__/security/securityVulnerabilityAudit.test.ts';
let s = fs.readFileSync(p, 'utf8');

const start = "  describe('2. Health Vault Cryptographic Security & Anti-Tampering', () => {";
const end = "  describe('3. Path Traversal & File Name Injection Defense', () => {";
const i = s.indexOf(start);
const j = s.indexOf(end);
if (i === -1 || j === -1 || j <= i) throw new Error('MARKER YOK');

const replacement = `  /**
   * v1.7.4 (Faz 0.6) — "2. Health Vault Cryptographic Security" blogu KALDIRILDI.
   *
   * Test ettigi \`healthVaultCrypto\` modulu uretimde HIC kullanilmiyordu
   * (yalnizca bu test import ediyordu) ve kriptografik olarak gecersizdi:
   * 32 baytlik anahtarin TEKRAR EDEN XOR'u — bilinen duz metinle kirilir —
   * ve hata durumunda duz metni geri donduruyordu. Bu testlerin yesil olmasi
   * "saglik verisi sifreli" izlenimi veriyordu; gercekte ilac/doz verisi
   * AsyncStorage'da ve Firestore'da duz metin duruyor.
   *
   * Modul silindi, UI'daki "256-Bit Uctan Uca Sifreli / HIPAA" iddialari da
   * kaldirildi. Gercek sifreleme eklenirse (AES-GCM / libsodium) bu blok
   * yeniden yazilmalidir.
   */

`;

s = s.slice(0, i) + replacement + s.slice(j);
fs.writeFileSync(p, s, 'utf8');
console.log('OK  health vault test blogu kaldirildi');
