package com.ilachatirlatici

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * HeadlessJS Task Service for re-registering alarms after boot/timezone changes.
 * Runs in the background without UI.
 */
class BootTaskService : HeadlessJsTaskService() {
    companion object {
        private const val TAG = "BootTaskService"
        private const val CHANNEL_ID = "boot-task-channel"
        private const val NOTIFICATION_ID = 9999
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service onCreate")

        // For Android O+ we need to show a foreground notification
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                createNotificationChannel()
                startForeground(NOTIFICATION_ID, createNotification())
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start foreground", e)
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alarm Sync",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Alarm senkronizasyonu"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, CHANNEL_ID)
                    .setContentTitle("Alarmlar senkronize ediliyor")
                    .setContentText("Lütfen bekleyin...")
                    .setSmallIcon(android.R.drawable.ic_popup_sync)
                    .build()
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
                    .setContentTitle("Alarmlar senkronize ediliyor")
                    .setContentText("Lütfen bekleyin...")
                    .setSmallIcon(android.R.drawable.ic_popup_sync)
                    .build()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create notification", e)
            Notification()
        }
    }

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val trigger = intent?.getStringExtra("trigger") ?: "unknown"
        Log.d(TAG, "getTaskConfig called with trigger: $trigger")

        val extras = Bundle().apply {
            putString("trigger", trigger)
            putLong("timestamp", System.currentTimeMillis())
        }

        return HeadlessJsTaskConfig(
            "ReRegisterAlarmsTask",
            Arguments.fromBundle(extras),
            180000,  // 180 second timeout - daha uzun süre
            true    // Allow in foreground
        )
    }

    override fun onHeadlessJsTaskFinish(taskId: Int) {
        super.onHeadlessJsTaskFinish(taskId)
        Log.d(TAG, "HeadlessJS task finished: $taskId")

        // Stop foreground service
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            }
            stopSelf()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping service", e)
        }
    }
}
