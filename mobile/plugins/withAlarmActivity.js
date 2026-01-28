/**
 * Expo Config Plugin: withAlarmActivity
 *
 * MainActivity'ye lock screen'de gosterme ve ekrani acma
 * ozelliklerini ekler. Notifee full screen alarm icin kritik.
 */
const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

/**
 * AndroidManifest.xml'e MainActivity icin showWhenLocked ve turnScreenOn ekle
 */
function withManifestActivity(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;

    // application node'u bul
    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    // MainActivity'yi bul
    const activities = application.activity || [];
    const mainActivity = activities.find(
      (activity) => activity.$?.['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      // Lock screen ozelliklerini ekle
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
      mainActivity.$['android:showOnLockScreen'] = 'true';
    }

    return config;
  });
}

/**
 * MainActivity.kt'ye lock screen kodunu ekle
 */
function withMainActivityCode(config) {
  return withMainActivity(config, async (config) => {
    if (config.modResults.language === 'kt' || config.modResults.language === 'kotlin') {
      let contents = config.modResults.contents;

      // Import'lari ekle (eger yoksa)
      const imports = [
        'import android.app.KeyguardManager',
        'import android.content.Context',
        'import android.os.Build',
        'import android.view.WindowManager',
      ];

      for (const imp of imports) {
        if (!contents.includes(imp)) {
          // package satırindan sonra ekle
          contents = contents.replace(
            /(package\s+[\w.]+\s*\n)/,
            `$1\n${imp}\n`
          );
        }
      }

      // enableLockScreenVisibility fonksiyonunu ekle (eger yoksa)
      if (!contents.includes('enableLockScreenVisibility')) {
        const functionCode = `
  /**
   * Enable activity to show over lock screen and turn screen on.
   * Required for full-screen alarm notifications.
   */
  private fun enableLockScreenVisibility() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      // Android 8.1+ (API 27+) - Modern approach
      setShowWhenLocked(true)
      setTurnScreenOn(true)

      // Request to dismiss keyguard (lock screen)
      val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      keyguardManager.requestDismissKeyguard(this, null)
    } else {
      // Legacy approach for older Android versions
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
      )
    }

    // Keep screen on while activity is visible (optional, good for alarms)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }
`;

        // Class kapanış parantezinden önce ekle
        const lastBraceIndex = contents.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
          contents = contents.slice(0, lastBraceIndex) + functionCode + '\n' + contents.slice(lastBraceIndex);
        }
      }

      // onCreate'de enableLockScreenVisibility cagrisini ekle (eger yoksa)
      if (!contents.includes('enableLockScreenVisibility()')) {
        // super.onCreate(null) satırindan sonra ekle (daha spesifik regex)
        contents = contents.replace(
          /(super\.onCreate\(null\)[\s\r\n]*\})/,
          `super.onCreate(null)\n\n    // Enable showing activity over lock screen\n    enableLockScreenVisibility()\n  }`
        );
      }

      config.modResults.contents = contents;
    }

    return config;
  });
}

module.exports = function withAlarmActivity(config) {
  config = withManifestActivity(config);
  config = withMainActivityCode(config);
  return config;
};
