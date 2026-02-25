package com.ilachatirlatici

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native module: Ekran kapalıyken/kilitliyken uygulamayı açar.
 * Notifee fullScreenIntent MIUI'de güvenilir çalışmadığı için
 * bu modül WakeLock + Intent ile ekranı açıp MainActivity'yi başlatır.
 */
class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "AlarmModule"
        private const val WAKE_LOCK_TIMEOUT = 10_000L // 10 saniye
    }

    override fun getName(): String = "AlarmModule"

    /**
     * Ekranı aç ve uygulamayı başlat.
     * Background notification handler'dan çağrılır.
     */
    @ReactMethod
    fun wakeAndOpenApp(promise: Promise) {
        try {
            val context = reactApplicationContext

            // 1. Ekranı aç (WakeLock)
            wakeUpScreen(context)

            // 2. MainActivity'yi başlat (alarm deep link ile)
            val intent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = android.net.Uri.parse("ilachatirlatici://alarm")
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
            }
            context.startActivity(intent)

            Log.d(TAG, "wakeAndOpenApp: Ekran açıldı, uygulama başlatıldı")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "wakeAndOpenApp hatası", e)
            promise.resolve(false)
        }
    }

    private fun wakeUpScreen(context: Context) {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return

        if (!powerManager.isInteractive) {
            // Ekran kapalı — WakeLock ile aç
            @Suppress("DEPRECATION")
            val wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "$TAG:wake"
            )
            wakeLock.acquire(WAKE_LOCK_TIMEOUT)
            Log.d(TAG, "WakeLock acquired — ekran açılıyor")
        }
    }

    /**
     * Sadece ekranı aç (intent olmadan)
     * FullScreenIntent izni olmayan cihazlar için fallback
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
