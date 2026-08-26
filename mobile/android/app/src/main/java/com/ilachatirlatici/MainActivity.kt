package com.ilachatirlatici

import android.app.KeyguardManager
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
  override fun onCreate(savedInstanceState: Bundle?) {
    // Reset window brightness override to system default
    resetScreenBrightnessToDefault()
    
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)

    intent?.let { handleAlarmIntent(it) }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    resetScreenBrightnessToDefault()
  }

  override fun onResume() {
    super.onResume()
    resetScreenBrightnessToDefault()
    intent?.let { handleAlarmIntent(it) }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleAlarmIntent(intent)
  }

  private fun handleAlarmIntent(intent: Intent) {
    var medId = intent.getStringExtra("medicineId")
    var remId = intent.getStringExtra("reminderTimeId")
    var schedTime = intent.getStringExtra("scheduledTime")

    // Notifee notification bundle/data extras
    if (medId == null) {
      val notifBundle = intent.getBundleExtra("notification") ?: intent.getBundleExtra("notifee_notification")
      val dataBundle = notifBundle?.getBundle("data")
      if (dataBundle != null) {
        medId = dataBundle.getString("medicineId")
        remId = dataBundle.getString("reminderTimeId")
        schedTime = dataBundle.getString("scheduledTime")
      }
    }

    // Deep link Uri query params
    if (medId == null && intent.data != null) {
      medId = intent.data?.getQueryParameter("medicineId")
      remId = intent.data?.getQueryParameter("reminderTimeId")
      schedTime = intent.data?.getQueryParameter("scheduledTime")
    }

    // If alarm notification triggered
    val isAlarm = medId != null || intent.hasExtra("notification") || intent.hasExtra("notifee_notification") || (intent.data != null && intent.data.toString().contains("alarm"))
    if (isAlarm) {
      // Enable lockscreen display only for actual alarm events
      enableLockScreenVisibilityForAlarm()

      val finalMedId = medId ?: "test-medicine"
      val finalRemId = remId ?: "test-reminder"
      val params = Arguments.createMap().apply {
        putString("medicineId", finalMedId)
        putString("reminderTimeId", finalRemId)
        putString("scheduledTime", schedTime ?: "")
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
   * Enable activity to show over lock screen only when a critical medication alarm is active.
   */
  private fun enableLockScreenVisibilityForAlarm() {
    // 1. Android 8.1+ (API 27+) Native Activity flags
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }

    // 2. Request Keyguard Dismissal
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
      keyguardManager?.requestDismissKeyguard(this, null)
    }

    // 3. Window Flags for showing over lock screen
    @Suppress("DEPRECATION")
    window.addFlags(
      WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
      WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
      WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON or
      WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
    )
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
