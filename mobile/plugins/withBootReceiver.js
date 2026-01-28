/**
 * Expo Config Plugin: withBootReceiver
 *
 * BOOT_COMPLETED, TIME_SET ve TIMEZONE_CHANGED intent'lerini dinleyen
 * bir BroadcastReceiver ekler. Bu sayede telefon restart oldugunda
 * veya timezone degistiginde alarmlar yeniden planlanabilir.
 *
 * HeadlessJS task ile baglanarak arka planda calisir.
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.ilachatirlatici';

/**
 * BootReceiver.kt native dosyasini olustur
 */
function createBootReceiverFile(projectRoot) {
  const bootReceiverDir = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'java',
    'com',
    'ilachatirlatici'
  );

  // Dizin yoksa olustur
  if (!fs.existsSync(bootReceiverDir)) {
    fs.mkdirSync(bootReceiverDir, { recursive: true });
  }

  const bootReceiverPath = path.join(bootReceiverDir, 'BootReceiver.kt');

  const bootReceiverCode = `package ${PACKAGE_NAME}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BootReceiver"
        private const val ACTION_TIME_SET = "android.intent.action.TIME_SET"
        private const val ACTION_LOCKED_BOOT_COMPLETED = "android.intent.action.LOCKED_BOOT_COMPLETED"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Received broadcast: \$action")

        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            ACTION_LOCKED_BOOT_COMPLETED,
            ACTION_TIME_SET,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                Log.d(TAG, "Starting BootTaskService for action: \$action")
                
                val serviceIntent = Intent(context, BootTaskService::class.java).apply {
                    putExtra("trigger", action)
                }
                
                try {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent)
                    } else {
                        context.startService(serviceIntent)
                    }
                    Log.d(TAG, "BootTaskService started successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to start BootTaskService", e)
                }
            }
            else -> {
                Log.d(TAG, "Ignoring action: \$action")
            }
        }
    }
}
`;

  fs.writeFileSync(bootReceiverPath, bootReceiverCode);
  console.log('[withBootReceiver] Created BootReceiver.kt');
}

/**
 * BootTaskService.kt HeadlessJS service dosyasini olustur
 */
function createBootTaskServiceFile(projectRoot) {
  const serviceDir = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'java',
    'com',
    'ilachatirlatici'
  );

  const servicePath = path.join(serviceDir, 'BootTaskService.kt');

  const serviceCode = `package ${PACKAGE_NAME}

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
            createNotificationChannel()
            startForeground(NOTIFICATION_ID, createNotification())
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
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Alarmlar senkronize ediliyor")
                .setContentText("Lutfen bekleyin...")
                .setSmallIcon(android.R.drawable.ic_popup_sync)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("Alarmlar senkronize ediliyor")
                .setContentText("Lutfen bekleyin...")
                .setSmallIcon(android.R.drawable.ic_popup_sync)
                .build()
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
            60000,  // 60 second timeout
            true    // Allow in foreground
        )
    }

    override fun onHeadlessJsTaskFinish(taskId: Int) {
        super.onHeadlessJsTaskFinish(taskId)
        Log.d(TAG, "HeadlessJS task finished: $taskId")
        
        // Stop foreground service
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        }
        stopSelf()
    }
}
`;

  fs.writeFileSync(servicePath, serviceCode);
  console.log('[withBootReceiver] Created BootTaskService.kt');
}

/**
 * AndroidManifest.xml'e receiver ve service ekle
 */
function withManifestReceiver(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;

    // application node'u bul
    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    // BootReceiver ekle (yoksa)
    if (!application.receiver) {
      application.receiver = [];
    }

    const hasBootReceiver = application.receiver.some(
      (r) => r.$?.['android:name'] === '.BootReceiver'
    );

    if (!hasBootReceiver) {
      application.receiver.push({
        $: {
          'android:name': '.BootReceiver',
          'android:enabled': 'true',
          'android:exported': 'true',
          'android:directBootAware': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.LOCKED_BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.TIME_SET' } },
              { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
              { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
            ],
          },
        ],
      });
      console.log('[withBootReceiver] Added BootReceiver to manifest');
    }

    // BootTaskService ekle (yoksa)
    if (!application.service) {
      application.service = [];
    }

    const hasBootTaskService = application.service.some(
      (s) => s.$?.['android:name'] === '.BootTaskService'
    );

    if (!hasBootTaskService) {
      application.service.push({
        $: {
          'android:name': '.BootTaskService',
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'shortService',
        },
      });
      console.log('[withBootReceiver] Added BootTaskService to manifest');
    }

    return config;
  });
}

/**
 * Native Kotlin dosyalarini olustur
 */
function withNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      createBootReceiverFile(projectRoot);
      createBootTaskServiceFile(projectRoot);
      
      return config;
    },
  ]);
}

/**
 * Main plugin function
 */
module.exports = function withBootReceiver(config) {
  config = withManifestReceiver(config);
  config = withNativeFiles(config);
  return config;
};
