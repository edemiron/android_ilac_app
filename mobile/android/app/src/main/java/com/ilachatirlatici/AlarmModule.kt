package com.ilachatirlatici

import android.app.AlarmManager
import android.app.KeyguardManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.util.Log
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Native module: Ekran kapalıyken/kilitliyken uygulamayı açar.
 * AlarmManager.setAlarmClock + WakeLock + Intent ile ekranı açıp MainActivity'yi başlatır.
 */
class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        reactContextCached = reactContext
    }

    companion object {
        private const val TAG = "AlarmModule"
        private const val WAKE_LOCK_TIMEOUT = 15_000L // 15 saniye

        @Volatile
        private var hardwareHandlingEnabled: Boolean = false

        @Volatile
        private var reactContextCached: ReactApplicationContext? = null

        /**
         * Volume button action'ı JS'e emit et (mute/snooze).
         * MainActivity.dispatchKeyEvent tarafından çağrılır.
         */
        @JvmStatic
        fun emitHardwareButtonAction(action: String) {
            val ctx = reactContextCached ?: return
            val params: WritableMap = Arguments.createMap().apply {
                putString("action", action)
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("AlarmHardwareButton", params)
            Log.d(TAG, "emitHardwareButtonAction: $action")
        }

        /**
         * Alarm tetiklendiğinde JS'e anında event fırlat.
         */
        @JvmStatic
        fun emitAlarmTriggered(params: WritableMap) {
            val ctx = reactContextCached ?: return
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("OnAlarmTriggered", params)
            Log.d(TAG, "emitAlarmTriggered sent to JS")
        }

        /**
         * Volume button handling aktif mi?
         */
        @JvmStatic
        fun isAlarmHardwareHandlingEnabled(): Boolean = hardwareHandlingEnabled
    }

    override fun getName(): String = "AlarmModule"

    @ReactMethod
    fun setAlarmHardwareHandlingEnabled(enabled: Boolean) {
        hardwareHandlingEnabled = enabled
        reactContextCached = reactApplicationContext
        Log.d(TAG, "setAlarmHardwareHandlingEnabled: $enabled")
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // RN event emitter için gerekli — no-op
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // RN event emitter için gerekli — no-op
    }

    /**
     * Android Native AlarmManager.setAlarmClock ile doğrudan kilit ekranını uyandıran alarm kurar.
     */
    @ReactMethod
    fun scheduleNativeAlarm(triggerTimeMs: Double, medicineId: String, reminderTimeId: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            reactContextCached = context
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (alarmManager == null) {
                promise.resolve(false)
                return
            }

            val intent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse("ilachatirlatici://alarm?medicineId=$medicineId&reminderTimeId=$reminderTimeId")
                putExtra("medicineId", medicineId)
                putExtra("reminderTimeId", reminderTimeId)
                putExtra("scheduledTime", System.currentTimeMillis().toString())
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val requestCode = (medicineId.hashCode() xor reminderTimeId.hashCode()) and 0x7FFFFFFF
            val pendingIntent = PendingIntent.getActivity(context, requestCode, intent, flags)
            val showIntent = PendingIntent.getActivity(context, requestCode + 1, intent, flags)
            val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTimeMs.toLong(), showIntent)

            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
            Log.d(TAG, "scheduleNativeAlarm: AlarmManager.setAlarmClock kuruldu (triggerTime: $triggerTimeMs)")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "scheduleNativeAlarm hatası", e)
            promise.resolve(false)
        }
    }

    /**
     * Ekranı aç, MainActivity'yi başlat ve JS'e Alarm event'i fırlat.
     */
    @ReactMethod
    fun wakeAndOpenApp(data: ReadableMap?, promise: Promise) {
        try {
            val context = reactApplicationContext
            reactContextCached = context

            // 1. Ekranı aç (WakeLock)
            wakeUpScreen(context)

            val medId = data?.getString("medicineId") ?: "test-medicine"
            val remId = data?.getString("reminderTimeId") ?: "test-reminder"
            val schedTime = data?.getString("scheduledTime") ?: ""

            // 2. MainActivity'yi başlat (alarm deep link ile)
            val intent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                this.data = Uri.parse("ilachatirlatici://alarm?medicineId=$medId&reminderTimeId=$remId")
                putExtra("medicineId", medId)
                putExtra("reminderTimeId", remId)
                putExtra("scheduledTime", schedTime)
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
            }
            context.startActivity(intent)

            // 3. JS'e anlık Event fırlat
            val eventParams = Arguments.createMap().apply {
                putString("medicineId", medId)
                putString("reminderTimeId", remId)
                putString("scheduledTime", schedTime)
            }
            emitAlarmTriggered(eventParams)

            Log.d(TAG, "wakeAndOpenApp: Ekran açıldı, uygulama başlatıldı, OnAlarmTriggered emit edildi")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "wakeAndOpenApp hatası", e)
            promise.resolve(false)
        }
    }

    private fun wakeUpScreen(context: Context) {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return

        try {
            @Suppress("DEPRECATION")
            val wakeLock = powerManager.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "$TAG:wake"
            )
            wakeLock.acquire(WAKE_LOCK_TIMEOUT)
            Log.d(TAG, "WakeLock acquired — ekran açılıyor")
        } catch (e: Exception) {
            Log.e(TAG, "WakeLock error", e)
        }
    }

    /**
     * Sadece ekranı aç (intent olmadan)
     */
    @ReactMethod
    fun wakeScreenOnly(promise: Promise) {
        try {
            val context = reactApplicationContext
            wakeUpScreen(context)
            Log.d(TAG, "wakeScreenOnly: Ekran açıldı")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "wakeScreenOnly hatası", e)
            promise.resolve(false)
        }
    }
}
