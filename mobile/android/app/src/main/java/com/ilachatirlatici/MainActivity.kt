package com.ilachatirlatici

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.util.Log
import android.view.KeyEvent
import android.view.WindowManager
import com.facebook.react.bridge.Arguments

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

  companion object {
    private const val TAG = "MainActivity"
    private const val ALARM_WAKE_LOCK_TIMEOUT = 10_000L

    /**
     * Alarm penceresi (showWhenLocked + turnScreenOn) su an aktif mi?
     * AlarmModule.clearLockScreenFlags tarafindan da sifirlanir.
     */
    @Volatile
    @JvmStatic
    var alarmWindowActive: Boolean = false
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Reset window brightness override to system default
    resetScreenBrightnessToDefault()

    // Kilit ekrani penceresini SADECE gercek bir alarm intent'i ile acildiysa hazirla.
    // Normal aciliste dokunmuyoruz: aksi halde tum uygulama kalici olarak kilit
    // ekraninda gorunur kalir (gizlilik) ve her resume'da parola istegi tetiklenir.
    if (isAlarmIntent(intent)) {
      applyAlarmWindow()
    }
    
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme)
    super.onCreate(null)

    intent?.let { handleAlarmIntent(it) }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    resetScreenBrightnessToDefault()
    if (alarmWindowActive) {
      applyAlarmWindow()
    }
  }

  override fun onResume() {
    super.onResume()
    resetScreenBrightnessToDefault()
    // Alarm disi normal aciliste kilit ekrani bayraklarini birak.
    if (!alarmWindowActive && !isAlarmIntent(intent)) {
      releaseAlarmWindow()
    }
    intent?.let { handleAlarmIntent(it) }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    if (isAlarmIntent(intent)) {
      applyAlarmWindow()
    }
    handleAlarmIntent(intent)
  }

  private fun handleAlarmIntent(intent: Intent) {
    // Aynı intent örneğinin tekrar tekrar onResume'da tetiklenmesini engelle
    if (intent.getBooleanExtra("alarm_consumed", false)) {
      return
    }

    val uriString = intent.data?.toString() ?: ""
    val isAlarmUri = uriString.startsWith("ilachatirlatici://alarm")
    val isExplicitAlarmTrigger = intent.getBooleanExtra("isAlarmTrigger", false)

    var medId = intent.getStringExtra("medicineId")
    var remId = intent.getStringExtra("reminderTimeId")
    var schedTime = intent.getStringExtra("scheduledTime")
    // ERTELEME BILGISI: AlarmScreen hangi native requestCode uzayini (main /
    // snooze) iptal edecegine buna gore karar veriyor. Eskiden bu iki alan hic
    // tasinmiyordu, JS tarafi her alarmi "ana alarm" saniyordu.
    var isSnoozeStr = intent.getStringExtra("isSnooze")
    var snoozeIdStr = intent.getStringExtra("snoozeId")

    // Notifee notification bundle/data extras (Bundle vs JSON String)
    if (medId == null) {
      val notifBundle = intent.getBundleExtra("notification") ?: intent.getBundleExtra("notifee_notification")
      val dataBundle = notifBundle?.getBundle("data")
      if (dataBundle != null) {
        medId = dataBundle.getString("medicineId")
        remId = dataBundle.getString("reminderTimeId")
        schedTime = dataBundle.getString("scheduledTime")
        if (isSnoozeStr == null) isSnoozeStr = dataBundle.getString("isSnooze")
        if (snoozeIdStr == null) snoozeIdStr = dataBundle.getString("snoozeId")
      }
    }

    if (medId == null) {
      val notifJsonStr = intent.getStringExtra("notification") ?: intent.getStringExtra("notifee_notification")
      if (notifJsonStr != null) {
        try {
          val jsonObj = org.json.JSONObject(notifJsonStr)
          val dataObj = jsonObj.optJSONObject("data")
          if (dataObj != null) {
            if (medId == null) medId = dataObj.optString("medicineId", null)
            if (remId == null) remId = dataObj.optString("reminderTimeId", null)
            if (schedTime == null) schedTime = dataObj.optString("scheduledTime", null)
            if (isSnoozeStr == null) isSnoozeStr = dataObj.optString("isSnooze", null)
            if (snoozeIdStr == null) snoozeIdStr = dataObj.optString("snoozeId", null)
          }
        } catch (_e: Exception) {
          // ignore
        }
      }
    }

    // Deep link Uri query params
    if (medId == null && intent.data != null && isAlarmUri) {
      medId = intent.data?.getQueryParameter("medicineId")
      remId = intent.data?.getQueryParameter("reminderTimeId")
      schedTime = intent.data?.getQueryParameter("scheduledTime")
    }
    if (isSnoozeStr == null && intent.data != null && isAlarmUri) {
      isSnoozeStr = intent.data?.getQueryParameter("isSnooze")
      if (snoozeIdStr == null) snoozeIdStr = intent.data?.getQueryParameter("snoozeId")
    }

    // Sadece gerçek alarm tetiklemelerinde çalış:
    val hasNotifeeAlarm = intent.hasExtra("notification") || intent.hasExtra("notifee_notification")
    val isAlarm = (medId != null && remId != null) || isExplicitAlarmTrigger || isAlarmUri || hasNotifeeAlarm

    if (isAlarm) {
      // v1.7.4 (Faz 0.4): kimlik uydurma ("test-medicine") KALDIRILDI.
      // Kimliksiz bir intent (ör. tarayıcıdan gelen `ilachatirlatici://alarm`)
      // JS tarafında doğrulamayı atlayan test moduna düşüyordu. Kimlik yoksa
      // alarm penceresi de açılmaz.
      if (medId.isNullOrBlank() || remId.isNullOrBlank()) {
        Log.w(TAG, "handleAlarmIntent: medicineId/reminderTimeId yok, YOKSAYILDI")
        intent.putExtra("alarm_consumed", true)
        return
      }

      // Intent'i tüketildi olarak işaretle — onResume tekrar tetiklemesin
      intent.putExtra("alarm_consumed", true)

      // Kilit ekrani ustunde goster + ekrani uyandir (keyguard dismiss YOK)
      applyAlarmWindow()

      val params = Arguments.createMap().apply {
        putString("medicineId", medId)
        putString("reminderTimeId", remId)
        putString("scheduledTime", schedTime ?: "")
        if (!isSnoozeStr.isNullOrEmpty()) putString("isSnooze", isSnoozeStr)
        if (!snoozeIdStr.isNullOrEmpty()) putString("snoozeId", snoozeIdStr)
      }
      AlarmModule.emitAlarmTriggered(params)
    }
  }

  /**
   * Reset screen brightness override so that Android system brightness & auto-brightness
   * are fully respected without blinding the user.
   */
  private fun resetScreenBrightnessToDefault() {
    try {
      val lp = window.attributes
      lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
      window.attributes = lp
    } catch (_e: Exception) {
      // ignore
    }
  }

  /**
   * Bu intent gercek bir alarm tetiklemesi mi?
   * (AlarmReceiver / AlarmModule / notifee fullScreenAction / alarm deep link)
   */
  private fun isAlarmIntent(intent: Intent?): Boolean {
    if (intent == null) return false
    if (intent.getBooleanExtra("isAlarmTrigger", false)) return true
    val uriString = intent.data?.toString() ?: ""
    if (uriString.startsWith("ilachatirlatici://alarm")) return true
    if (intent.hasExtra("notification") || intent.hasExtra("notifee_notification")) return true
    return intent.getStringExtra("medicineId") != null &&
      intent.getStringExtra("reminderTimeId") != null
  }

  /**
   * Alarmi kilit ekraninin USTUNDE goster ve ekrani uyandir.
   *
   * KRITIK: Burada KeyguardManager.requestDismissKeyguard() ve FLAG_DISMISS_KEYGUARD
   * BILEREK KULLANILMAZ. Bunlar "kilidi ac" talebidir; guvenli kilitte (PIN/parola/desen)
   * sistemin cevabi parola ekranini (bouncer) alarmin ustune koymaktir ve kullanici
   * parolayi girmeden alarmi goremez. setShowWhenLocked(true) tek basina, parola
   * sormadan kilit ekranini "occlude" etmek icin yeterlidir.
   * Bu satirlari geri eklemeyin — Bug: "tam ekran bildirim kilit ekranini asamiyor".
   */
  private fun applyAlarmWindow() {
    try {
      alarmWindowActive = true

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        setShowWhenLocked(true)
        setTurnScreenOn(true)
      }

      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
      )

      acquireAlarmWakeLock()
    } catch (e: Exception) {
      Log.e(TAG, "applyAlarmWindow error", e)
    }
  }

  /**
   * Alarm bittiginde pencereyi normale dondur — uygulama kilit ekraninda gorunur kalmasin.
   */
  private fun releaseAlarmWindow() {
    try {
      alarmWindowActive = false

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        setShowWhenLocked(false)
        setTurnScreenOn(false)
      }

      @Suppress("DEPRECATION")
      window.clearFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
      )
    } catch (e: Exception) {
      Log.e(TAG, "releaseAlarmWindow error", e)
    }
  }

  /**
   * Ekrani uyandirmak icin kisa sureli WakeLock — sadece alarm yolunda alinir.
   */
  private fun acquireAlarmWakeLock() {
    try {
      val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
      @Suppress("DEPRECATION")
      val wakeLock = powerManager.newWakeLock(
        PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
        PowerManager.ACQUIRE_CAUSES_WAKEUP or
        PowerManager.ON_AFTER_RELEASE,
        "$TAG:AlarmWakeLock"
      )
      wakeLock.acquire(ALARM_WAKE_LOCK_TIMEOUT)
    } catch (e: Exception) {
      Log.e(TAG, "acquireAlarmWakeLock error", e)
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (shouldHandleAlarmHardwareButton(event)) {
      val action = when (event.keyCode) {
        KeyEvent.KEYCODE_VOLUME_DOWN -> "mute"
        KeyEvent.KEYCODE_VOLUME_UP -> "snooze"
        else -> null
      }

      if (action != null) {
        AlarmModule.emitHardwareButtonAction(action)
        return true
      }
    }

    return super.dispatchKeyEvent(event)
  }

  private fun shouldHandleAlarmHardwareButton(event: KeyEvent): Boolean {
    if (!AlarmModule.isAlarmHardwareHandlingEnabled()) {
      return false
    }

    if (event.action != KeyEvent.ACTION_DOWN || event.repeatCount > 0) {
      return false
    }

    return event.keyCode == KeyEvent.KEYCODE_VOLUME_DOWN ||
      event.keyCode == KeyEvent.KEYCODE_VOLUME_UP
  }

}
