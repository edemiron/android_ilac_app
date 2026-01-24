/**
 * Firebase'e AI konfigürasyonu ekleyen script
 * 
 * Bu script Firebase'e Gemini/OpenAI API anahtarlarını ekler.
 * 
 * Kullanım:
 *   node scripts/setupAIConfig.js --provider=gemini --key=YOUR_API_KEY
 * 
 * Parametreler:
 *   --provider=gemini|openai  : AI sağlayıcı (varsayılan: gemini)
 *   --key=API_KEY             : API anahtarı
 *   --model=MODEL_NAME        : Model adı (opsiyonel)
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAKUg-0PsR-awOb-b3RjyrDo9UmNfsD45A",
  authDomain: "ilachatirlatici-15a71.firebaseapp.com",
  projectId: "ilachatirlatici-15a71",
  storageBucket: "ilachatirlatici-15a71.firebasestorage.app",
  messagingSenderId: "506876057044",
  appId: "1:506876057044:android:5d2d26ddbe32c8c4d53241",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Komut satırı argümanlarını parse et
const args = process.argv.slice(2);

function getArg(name) {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
}

const provider = getArg('provider') || 'gemini';
const apiKey = getArg('key');
const model = getArg('model');

async function showCurrentConfig() {
  console.log('Mevcut AI Konfigürasyonu:');
  console.log('-'.repeat(40));
  
  try {
    const docRef = doc(db, 'config', 'ai');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log(`Provider: ${data.provider || 'Ayarlanmamış'}`);
      console.log(`Gemini API Key: ${data.geminiApiKey ? '***' + data.geminiApiKey.slice(-4) : 'Yok'}`);
      console.log(`Gemini Model: ${data.geminiModel || 'gemini-1.5-flash'}`);
      console.log(`OpenAI API Key: ${data.openaiApiKey ? '***' + data.openaiApiKey.slice(-4) : 'Yok'}`);
      console.log(`OpenAI Model: ${data.openaiModel || 'gpt-4o-mini'}`);
    } else {
      console.log('Henüz yapılandırılmamış.');
    }
  } catch (error) {
    console.error('Hata:', error.message);
  }
  
  console.log('-'.repeat(40));
}

async function setAIConfig() {
  if (!apiKey) {
    console.log('Kullanım:');
    console.log('  node scripts/setupAIConfig.js --provider=gemini --key=YOUR_GEMINI_API_KEY');
    console.log('  node scripts/setupAIConfig.js --provider=openai --key=YOUR_OPENAI_API_KEY');
    console.log('');
    console.log('API Key Alma Talimatları:');
    console.log('');
    console.log('GEMINI (Önerilen - Ücretsiz):');
    console.log('  1. https://aistudio.google.com/app/apikey adresine gidin');
    console.log('  2. Google hesabınızla giriş yapın');
    console.log('  3. "Create API key" butonuna tıklayın');
    console.log('  4. Key\'i kopyalayın ve bu scripti çalıştırın');
    console.log('');
    console.log('OPENAI (Ücretli):');
    console.log('  1. https://platform.openai.com/api-keys adresine gidin');
    console.log('  2. Hesap oluşturun veya giriş yapın');
    console.log('  3. "Create new secret key" butonuna tıklayın');
    console.log('  4. Key\'i kopyalayın ve bu scripti çalıştırın');
    console.log('');
    
    await showCurrentConfig();
    process.exit(0);
  }
  
  const docRef = doc(db, 'config', 'ai');
  
  let configData = {
    provider: provider,
    updatedAt: new Date().toISOString(),
  };
  
  if (provider === 'gemini') {
    configData.geminiApiKey = apiKey;
    configData.geminiModel = model || 'gemini-2.0-flash';
  } else if (provider === 'openai') {
    configData.openaiApiKey = apiKey;
    configData.openaiModel = model || 'gpt-4o-mini';
  }
  
  try {
    // Mevcut config'i al ve birleştir
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      configData = { ...docSnap.data(), ...configData };
    }
    
    await setDoc(docRef, configData);
    
    console.log('AI Konfigürasyonu güncellendi!');
    console.log('');
    await showCurrentConfig();
    
  } catch (error) {
    console.error('Hata:', error.message);
    
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log('');
      console.log('Firebase Firestore API etkinleştirilmemiş!');
      console.log('');
      console.log('Çözüm:');
      console.log('1. Bu linke gidin: https://console.firebase.google.com/project/ilachatirlatici-15a71/firestore');
      console.log('2. "Create database" butonuna tıklayın');
      console.log('3. Location: eur3 (europe-west) seçin');
      console.log('4. Mode: "Start in test mode" seçin');
      console.log('5. Bu scripti tekrar çalıştırın');
    }
  }
  
  process.exit(0);
}

setAIConfig();
