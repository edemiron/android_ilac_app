/**
 * AI saglayici/model tercihini yonetir (config/ai dokumani).
 *
 * ONEMLI — API ANAHTARLARI ARTIK BURAYA YAZILMAZ
 * ----------------------------------------------
 * Bu script eskiden mobile/scripts/setupAIConfig.js altindaydi ve
 * geminiApiKey / openaiApiKey alanlarini Firestore'a DUZ METIN yaziyordu.
 * firestore.rules `config` icin `allow read: if isAuthenticated()` dedigi icin
 * uygulamaya kaydolan HERKES bu anahtarlari cekebiliyordu.
 *
 * Artik:
 *   - config/ai yalnizca sir OLMAYAN alanlari tutar (provider, model adlari).
 *   - Dokuman istemciye tamamen kapalidir; yalnizca Admin SDK ve Cloud
 *     Functions okur.
 *   - Anahtarlar Secret Manager'da durur:
 *
 *       firebase functions:secrets:set GEMINI_API_KEY
 *       firebase functions:secrets:set OPENAI_API_KEY
 *
 * Kullanim:
 *   node scripts/setupAIConfig.js                      # mevcut ayari goster
 *   node scripts/setupAIConfig.js --provider=gemini
 *   node scripts/setupAIConfig.js --provider=openai --model=gpt-4o-mini
 *
 * Kimlik dogrulama: Application Default Credentials
 *   gcloud auth application-default login
 */

const admin = require('firebase-admin');

const PROJECT_ID = 'ilachatirlatici-15a71';
const VALID_PROVIDERS = ['gemini', 'openai'];
const SECRET_FIELDS = ['geminiApiKey', 'openaiApiKey', 'apiKey'];

const args = process.argv.slice(2);

function getArg(name) {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
}

if (args.some(a => a.startsWith('--key='))) {
  console.error('HATA: --key parametresi kaldirildi.\n');
  console.error('API anahtarlari Firestore\'a yazilmaz. Secret Manager kullanin:\n');
  console.error('  firebase functions:secrets:set GEMINI_API_KEY');
  console.error('  firebase functions:secrets:set OPENAI_API_KEY\n');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

async function showCurrentConfig() {
  const snap = await db.collection('config').doc('ai').get();

  console.log('Mevcut AI Konfigurasyonu');
  console.log('-'.repeat(40));

  if (!snap.exists) {
    console.log('Henuz yapilandirilmamis (varsayilan: gemini).');
    console.log('-'.repeat(40));
    return;
  }

  const data = snap.data();
  console.log(`Provider     : ${data.provider || 'gemini (varsayilan)'}`);
  console.log(`Gemini Model : ${data.geminiModel || 'gemini-2.5-flash (varsayilan)'}`);
  console.log(`OpenAI Model : ${data.openaiModel || 'gpt-4o-mini (varsayilan)'}`);

  const leftoverSecrets = SECRET_FIELDS.filter(f => data[f]);
  if (leftoverSecrets.length > 0) {
    console.log('');
    console.log('UYARI: Bu dokumanda hala anahtar alanlari var:');
    leftoverSecrets.forEach(f => console.log(`  - ${f}`));
    console.log('Bu anahtarlar gecmiste tum kullanicilara acikti — ONCE IPTAL EDIN,');
    console.log('sonra `--purge-secrets` ile alanlari silin.');
  }

  console.log('-'.repeat(40));
}

async function purgeSecrets() {
  const ref = db.collection('config').doc('ai');
  const updates = {};
  SECRET_FIELDS.forEach(f => {
    updates[f] = admin.firestore.FieldValue.delete();
  });

  await ref.set(updates, { merge: true });
  console.log('Anahtar alanlari config/ai dokumanindan silindi.');
  console.log('Anahtarlari Google/OpenAI konsolundan IPTAL ETMEYI unutmayin.');
}

async function main() {
  if (args.includes('--purge-secrets')) {
    await purgeSecrets();
    console.log('');
    await showCurrentConfig();
    return;
  }

  const provider = getArg('provider');
  const model = getArg('model');

  if (!provider && !model) {
    await showCurrentConfig();
    return;
  }

  if (provider && !VALID_PROVIDERS.includes(provider)) {
    console.error(`HATA: gecersiz provider "${provider}". Gecerli: ${VALID_PROVIDERS.join(', ')}`);
    process.exit(1);
  }

  const update = { updatedAt: new Date().toISOString() };
  if (provider) update.provider = provider;
  if (model) {
    if (provider === 'openai') update.openaiModel = model;
    else update.geminiModel = model;
  }

  await db.collection('config').doc('ai').set(update, { merge: true });
  console.log('AI konfigurasyonu guncellendi.\n');
  await showCurrentConfig();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Hata:', error.message);
    process.exit(1);
  });
