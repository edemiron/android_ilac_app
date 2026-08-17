/**
 * AI model tercihini yonetir (config/ai dokumani).
 *
 * ONEMLI — API ANAHTARLARI BURAYA YAZILMAZ
 * ----------------------------------------
 * Bu script eskiden mobile/scripts/setupAIConfig.js altindaydi ve
 * geminiApiKey / openaiApiKey alanlarini Firestore'a DUZ METIN yaziyordu.
 * firestore.rules `config` icin `allow read: if isAuthenticated()` dedigi icin
 * uygulamaya kaydolan HERKES bu anahtarlari cekebiliyordu.
 *
 * Artik:
 *   - config/ai yalnizca sir OLMAYAN alanlari tutar (model adi).
 *   - Dokuman istemciye tamamen kapalidir; yalnizca Admin SDK ve Cloud
 *     Functions okur.
 *   - Anahtar Secret Manager'da durur:
 *
 *       firebase functions:secrets:set GEMINI_API_KEY
 *
 * Dokuman yoksa Cloud Function varsayilan modele duser
 * (gemini-2.5-flash) — yani bu script yalnizca modeli degistirmek
 * istedigin zaman gereklidir.
 *
 * Kullanim:
 *   node scripts/setupAIConfig.js                        # mevcut ayari goster
 *   node scripts/setupAIConfig.js --model=gemini-2.5-pro
 *   node scripts/setupAIConfig.js --purge-secrets        # eski anahtar alanlarini sil
 *
 * Kimlik dogrulama: Application Default Credentials
 *   gcloud auth application-default login
 */

const admin = require('firebase-admin');

const PROJECT_ID = 'ilachatirlatici-15a71';
const DEFAULT_MODEL = 'gemini-2.5-flash';

/** Gecmiste sizdirilan alanlar — tekrar ortaya cikarsa yakalanmali. */
const SECRET_FIELDS = ['geminiApiKey', 'openaiApiKey', 'apiKey'];

const args = process.argv.slice(2);

function getArg(name) {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
}

if (args.some(a => a.startsWith('--key='))) {
  console.error('HATA: --key parametresi kaldirildi.\n');
  console.error("API anahtarlari Firestore'a yazilmaz. Secret Manager kullanin:\n");
  console.error('  firebase functions:secrets:set GEMINI_API_KEY\n');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

async function showCurrentConfig() {
  const snap = await db.collection('config').doc('ai').get();

  console.log('Mevcut AI Konfigurasyonu');
  console.log('-'.repeat(40));

  if (!snap.exists) {
    console.log(`Dokuman yok — Cloud Function varsayilani kullaniyor: ${DEFAULT_MODEL}`);
    console.log('-'.repeat(40));
    return;
  }

  const data = snap.data();
  console.log(`Gemini Model : ${data.geminiModel || `${DEFAULT_MODEL} (varsayilan)`}`);

  const leftoverSecrets = SECRET_FIELDS.filter(f => data[f]);
  if (leftoverSecrets.length > 0) {
    console.log('');
    console.log('UYARI: Bu dokumanda anahtar alanlari var:');
    leftoverSecrets.forEach(f => console.log(`  - ${f}`));
    console.log('Bu anahtarlar tum kullanicilara acik demektir — ONCE IPTAL EDIN,');
    console.log('sonra `--purge-secrets` ile alanlari silin.');
  }

  console.log('-'.repeat(40));
}

async function purgeSecrets() {
  const updates = {};
  SECRET_FIELDS.forEach(f => {
    updates[f] = admin.firestore.FieldValue.delete();
  });

  await db.collection('config').doc('ai').set(updates, { merge: true });
  console.log('Anahtar alanlari config/ai dokumanindan silindi.');
  console.log('Anahtarlari Google konsolundan IPTAL ETMEYI unutmayin.');
}

async function main() {
  if (args.includes('--purge-secrets')) {
    await purgeSecrets();
    console.log('');
    await showCurrentConfig();
    return;
  }

  const model = getArg('model');

  if (!model) {
    await showCurrentConfig();
    return;
  }

  await db
    .collection('config')
    .doc('ai')
    .set({ geminiModel: model, updatedAt: new Date().toISOString() }, { merge: true });

  console.log('AI modeli guncellendi.\n');
  await showCurrentConfig();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Hata:', error.message);
    process.exit(1);
  });
