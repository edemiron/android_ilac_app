package com.ilachatirlatici

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BootReceiver"
        private const val ACTION_TIME_SET = "android.intent.action.TIME_SET"
        private const val ACTION_LOCKED_BOOT_COMPLETED = "android.intent.action.LOCKED_BOOT_COMPLETED"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Received broadcast: $action")

        // Hata durumunda crash önlemek için try-catch
        try {
            when (action) {
                Intent.ACTION_BOOT_COMPLETED,
                ACTION_LOCKED_BOOT_COMPLETED,
                ACTION_TIME_SET,
                Intent.ACTION_TIMEZONE_CHANGED,
                Intent.ACTION_MY_PACKAGE_REPLACED -> {
                    Log.d(TAG, "Starting BootTaskService for action: $action")

                    val serviceIntent = Intent(context, BootTaskService::class.java).apply {
                        putExtra("trigger", action)
                    }

                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent)
                        } else {
                            @Suppress("DEPRECATION")
                            context.startService(serviceIntent)
                        }
                        Log.d(TAG, "BootTaskService started successfully")
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to start BootTaskService", e)
                        // WorkManager zaten fallback olarak çalışıyor
                    }
                }
                else -> {
                    Log.d(TAG, "Ignoring action: $action")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "BootReceiver onReceive error", e)
            // Crash önlemek için - WorkManager fallback devrede
        }
    }
}
