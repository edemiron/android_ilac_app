package com.ilachatirlatici




import android.view.WindowManager
import android.view.KeyEvent
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    
    // Enable alarm visibility on lock screen
    enableLockScreenVisibility()
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

  /**
   * Enable activity to show over lock screen and turn screen on.
   * Required for full-screen alarm notifications.
   *
   * SECURITY NOTE: We deliberately do NOT call
   * `keyguardManager.requestDismissKeyguard()` or set
   * `FLAG_DISMISS_KEYGUARD` here. Those would bypass the device's lock
   * screen (PIN/biometric/pattern) every time the activity launches,
   * which is a theft risk on a locked device that happens to receive
   * an alarm. Instead we only request:
   *   - show the activity on top of the lock screen
   *   - turn the screen on
   * The user still needs to authenticate to dismiss the keyguard,
   * which is the correct privacy/security trade-off for a medical
   * reminder app.
   */
  private fun enableLockScreenVisibility() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      // Android 8.1+ (API 27+) - Modern approach
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      // Legacy approach for older Android versions.
      // We intentionally omit FLAG_DISMISS_KEYGUARD so the user must
      // authenticate to dismiss the lock screen.
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }

    // Keep screen on while activity is visible (optional, good for alarms)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
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
