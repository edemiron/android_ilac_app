/**
 * Expo config plugin — ana ekran widget'ini AndroidManifest'e kaydeder.
 *
 * NEDEN GEREKLI?
 * -------------
 * Widget receiver'lari yalnizca elle duzenlenmis
 * android/app/src/main/AndroidManifest.xml icinde tanimliydi. O dosya
 * mobile/.gitignore'daki `/android` kurali yuzunden VERSIYON KONTROLUNDE
 * DEGIL. Yani:
 *
 *   - `expo prebuild --clean` calistiginda widget kaydi tamamen siliniyordu,
 *   - temiz bir clone'da widget hic calismiyordu.
 *
 * Bu plugin kaydi kod tabanina tasir; prebuild sonrasi da hayatta kalir.
 *
 * Ayrica RECORD_AUDIO iznini kaldirir: uygulamada ses kaydi yok, izin
 * expo-camera'nin manifest'inden merge oluyor. Gerekcesiz mikrofon izni hem
 * gizlilik hem Play Store politikasi riski.
 */

const { withAndroidManifest } = require('@expo/config-plugins');

const TOOLS_NS = 'http://schemas.android.com/tools';

/**
 * `tools:` namespace'i manifest kokune ekler (yoksa).
 * tools:node="remove" kullanabilmek icin gerekli.
 */
function ensureToolsNamespace(manifest) {
  manifest.manifest.$ = manifest.manifest.$ || {};
  if (!manifest.manifest.$['xmlns:tools']) {
    manifest.manifest.$['xmlns:tools'] = TOOLS_NS;
  }
}

/**
 * RECORD_AUDIO iznini acikca kaldirir.
 * Sadece silmek yetmez — kutuphane manifest'inden tekrar merge olur.
 */
function removeRecordAudioPermission(manifest) {
  const permissions = manifest.manifest['uses-permission'] || [];
  const name = 'android.permission.RECORD_AUDIO';

  const filtered = permissions.filter(p => p.$?.['android:name'] !== name);

  filtered.push({
    $: {
      'android:name': name,
      'tools:node': 'remove',
    },
  });

  manifest.manifest['uses-permission'] = filtered;
}

function upsertReceiver(application, name, definition) {
  if (!application.receiver) {
    application.receiver = [];
  }

  const index = application.receiver.findIndex(r => r.$?.['android:name'] === name);

  if (index >= 0) {
    application.receiver[index] = definition;
  } else {
    application.receiver.push(definition);
    console.log(`[withMedicineWidget] Added ${name} to manifest`);
  }
}

function withMedicineWidget(config) {
  return withAndroidManifest(config, async config => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];

    if (!application) return config;

    ensureToolsNamespace(manifest);
    removeRecordAudioPermission(manifest);

    // Widget provider — sistem APPWIDGET_UPDATE yayinini alabilmek icin
    // exported=true olmak ZORUNDA. Bu yuzden burada yalnizca sistem action'i
    // bulunur; uygulama ici aksiyonlar (ornegin "ilac alindi") buraya
    // KONULMAMALI, aksi halde harici uygulamalar sahte yayin gonderebilir.
    upsertReceiver(application, '.MedicineWidgetProvider', {
      $: {
        'android:name': '.MedicineWidgetProvider',
        'android:enabled': 'true',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/widget_info',
          },
        },
      ],
    });

    // "Aldim" butonunun hedefi — exported=false.
    // Uygulamanin kendi PendingIntent'i explicit intent gonderdigi icin
    // exported olmasina gerek yok; boylece baska uygulamalar sahte doz kaydi
    // olusturamaz.
    upsertReceiver(application, '.MedicineTakenReceiver', {
      $: {
        'android:name': '.MedicineTakenReceiver',
        'android:enabled': 'true',
        'android:exported': 'false',
      },
    });

    return config;
  });
}

module.exports = withMedicineWidget;
