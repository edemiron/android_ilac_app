package com.ilachatirlatici

import android.app.Activity
import android.app.ActivityOptions
import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.WindowManager
import androidx.core.app.NotificationManagerCompat
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
        private const val WAKE_LOCK_TIMEOUT = 10_000L // 10 saniye (Pil tasarrufu optimizasyonu)

        @Volatile
        private var hardwareHandlingEnabled: Boolean = false

        @Volatile
        private var reactContextCached: ReactApplicationContext? = null

        @Volatile
        private var lastAlarmData: HashMap<String, String>? = null

        @Volatile
        private var cachedPreviousAlarmVolume: Int? = null

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
         * Alarm tetiklendiğinde JS'e anında event fırlat ve başlangıç için önbelleğe al.
         */
        @JvmStatic
        fun emitAlarmTriggered(params: WritableMap) {
            try {
                val cacheMap = HashMap<String, String>()
                if (params.hasKey("medicineId")) cacheMap["medicineId"] = params.getString("medicineId") ?: ""
                if (params.hasKey("reminderTimeId")) cacheMap["reminderTimeId"] = params.getString("reminderTimeId") ?: ""
                if (params.hasKey("scheduledTime")) cacheMap["scheduledTime"] = params.getString("scheduledTime") ?: ""
                lastAlarmData = cacheMap
            } catch (_e: Exception) {
                // ignore
            }

            val ctx = reactContextCached ?: return
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("OnAlarmTriggered", params)
            Log.d(TAG, "emitAlarmTriggered sent to JS and cached")
        }

        /**
         * Volume button handling aktif mi?
         */
        @JvmStatic
        fun isAlarmHardwareHandlingEnabled(): Boolean = hardwareHandlingEnabled
    }

    override fun getName(): String = "AlarmModule"

    @ReactMethod
    fun getInitialAlarm(promise: Promise) {
        val cached = lastAlarmData
        if (cached != null && cached.containsKey("medicineId") && cached["medicineId"]?.isNotEmpty() == true) {
            val map: WritableMap = Arguments.createMap().apply {
                putString("medicineId", cached["medicineId"])
                putString("reminderTimeId", cached["reminderTimeId"])
                putString("scheduledTime", cached["scheduledTime"])
            }
            promise.resolve(map)
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun clearInitialAlarm(promise: Promise) {
        lastAlarmData = null
        promise.resolve(true)
    }

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
     * Android Native AlarmManager.setAlarmClock ile AlarmReceiver üzerinden doğrudan kilit ekranını uyandıran alarm kurar.
     */
    @ReactMethod
    fun scheduleNativeAlarm(
        triggerTimeMs: Double,
        medicineId: String,
        reminderTimeId: String,
        alarmKind: String?,
        promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            reactContextCached = context
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (alarmManager == null) {
                promise.resolve(false)
                return
            }

            // 1. Alarm çaldığında çalışacak BroadcastReceiver Intent'i (Killed/Locked uyandırma güvencesi)
            val kind = if (alarmKind == AlarmReceiver.KIND_SNOOZE) {
                AlarmReceiver.KIND_SNOOZE
            } else {
                AlarmReceiver.KIND_MAIN
            }

            val triggerIntent = Intent(context, AlarmReceiver::class.java).apply {
                action = AlarmReceiver.ACTION_ALARM_TRIGGER
                putExtra("medicineId", medicineId)
                putExtra("reminderTimeId", reminderTimeId)
                putExtra("scheduledTime", triggerTimeMs.toLong().toString())
                putExtra("isAlarmTrigger", true)
                putExtra(AlarmReceiver.EXTRA_ALARM_KIND, kind)
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            // requestCode artik `kind` ile tuzlaniyor — ayni (ilac, hatirlatma)
            // cifti icin ana alarm ile erteleme alarmi AYRI PendingIntent'ler.
            // Eskiden ayni requestCode kullanildigi icin erteleme kurmak bir
            // sonraki gunun native alarmini siliyordu.
            val requestCode = AlarmReceiver.buildNotificationId(medicineId, reminderTimeId, kind)
            val pendingIntent = PendingIntent.getBroadcast(context, requestCode, triggerIntent, flags)

            // 2. showIntent: Kullanıcı kilit ekranı / durum çubuğundaki alarm saatine tıkladığında
            // ALARM ÇALDIRMAZ, sadece güvenle ana ekrana / uygulamaya yönlendirir.
            val showIntentTarget = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_MAIN
                data = Uri.parse("ilachatirlatici://home")
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
            }
            val showIntent = PendingIntent.getActivity(context, requestCode + 1, showIntentTarget, flags)
            val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTimeMs.toLong(), showIntent)

            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
            // DirectBoot DE storage aynasını güncelle (v1.9.3)
            DirectBootAlarmHelper.saveAlarm(context, triggerTimeMs.toLong(), medicineId, reminderTimeId, kind)
            Log.d(TAG, "scheduleNativeAlarm: AlarmManager.setAlarmClock kuruldu (triggerTime: $triggerTimeMs -> AlarmReceiver)")
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

            // v1.7.4 (Faz 0.4): "test-medicine" fallback'i kaldırıldı — kimlik
            // yoksa JS tarafı doğrulamayı atlayan test moduna düşüyordu.
            val medId = data?.getString("medicineId")
            val remId = data?.getString("reminderTimeId")
            if (medId.isNullOrBlank() || remId.isNullOrBlank()) {
                Log.w(TAG, "wakeAndOpenApp: medicineId/reminderTimeId yok, YOKSAYILDI")
                // Promise MUTLAKA çözülmeli; aksi halde JS tarafı süresiz bekler.
                promise.resolve(false)
                return
            }
            val schedTime = data.getString("scheduledTime") ?: ""

            // 2. MainActivity'yi başlat (alarm deep link ile)
            val intent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                this.data = Uri.parse("ilachatirlatici://alarm?medicineId=$medId&reminderTimeId=$remId")
                putExtra("medicineId", medId)
                putExtra("reminderTimeId", remId)
                putExtra("scheduledTime", schedTime)
                putExtra("isAlarmTrigger", true)
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val bOptions = ActivityOptions.makeBasic().apply {
                    setPendingIntentBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED)
                }.toBundle()
                context.startActivity(intent, bOptions)
            } else {
                context.startActivity(intent)
            }

            // 3. UI Thread'de kilit ekranı bayraklarını aç
            val act: Activity? = reactApplicationContext.currentActivity
            act?.runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                        act.setShowWhenLocked(true)
                        act.setTurnScreenOn(true)
                    }
                    // KRITIK: keyguard "dismiss" talebi BILEREK KALDIRILDI.
                    // Guvenli kilitte (PIN/parola) sistem parola ekranini alarmin ustune koyar.
                    // setShowWhenLocked(true) parola sormadan occlude etmek icin yeterlidir.
                    @Suppress("DEPRECATION")
                    act.window?.addFlags(
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    )
                    MainActivity.alarmWindowActive = true
                } catch (_e: Exception) {
                    // ignore
                }
            }

            // 4. JS'e anlık Event fırlat
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

    /**
     * Native AlarmManager'daki belirli bir alarmı iptal et.
     */
    @ReactMethod
    fun cancelNativeAlarm(
        medicineId: String,
        reminderTimeId: String,
        alarmKind: String?,
        promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (alarmManager != null) {
                val intent = Intent(context, AlarmReceiver::class.java).apply {
                    action = AlarmReceiver.ACTION_ALARM_TRIGGER
                }
                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
                // `kind` verilmezse ana alarm iptal edilir (eski davranis).
                val kind = if (alarmKind == AlarmReceiver.KIND_SNOOZE) {
                    AlarmReceiver.KIND_SNOOZE
                } else {
                    AlarmReceiver.KIND_MAIN
                }
                val requestCode =
                    AlarmReceiver.buildNotificationId(medicineId, reminderTimeId, kind)
                val pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags)
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
                // DirectBoot DE storage aynasından sil (v1.9.3)
                DirectBootAlarmHelper.removeAlarm(context, medicineId, reminderTimeId, kind)
                Log.d(TAG, "cancelNativeAlarm: Alarm iptal edildi ($medicineId - $reminderTimeId, kind=$kind)")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "cancelNativeAlarm hatası", e)
            promise.resolve(false)
        }
    }

    /**
     * Tüm native alarmları iptal eder ve DirectBoot aynasını temizler (v2.0.1).
     */
    @ReactMethod
    fun cancelAllNativeAlarms(promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            var cancelledCount = 0
            val prefs = DirectBootAlarmHelper.getPrefs(context)
            val allEntries = prefs.all

            for ((_, value) in allEntries) {
                if (value !is String) continue
                try {
                    val obj = org.json.JSONObject(value)
                    val medicineId = obj.getString("medicineId")
                    val reminderTimeId = obj.getString("reminderTimeId")
                    val kind = obj.optString("kind", AlarmReceiver.KIND_MAIN)

                    if (alarmManager != null) {
                        val intent = Intent(context, AlarmReceiver::class.java).apply {
                            action = AlarmReceiver.ACTION_ALARM_TRIGGER
                        }
                        val requestCode = AlarmReceiver.buildNotificationId(medicineId, reminderTimeId, kind)
                        val pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags)
                        alarmManager.cancel(pendingIntent)
                        pendingIntent.cancel()
                    }
                    cancelledCount++
                } catch (_e: Exception) {
                    // entry bazlı hata yutulur
                }
            }

            // DirectBoot DE storage alanını sıfırla
            DirectBootAlarmHelper.clearAllAlarms(context)
            Log.i(TAG, "cancelAllNativeAlarms: $cancelledCount native alarm ve DirectBoot aynası temizlendi")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "cancelAllNativeAlarms hatası", e)
            promise.resolve(false)
        }
    }

    /**
     * Direct Boot DE SharedPreferences alanındaki tüm kayıtları temizler (v2.0.1).
     */
    @ReactMethod
    fun clearAllDirectBootAlarms(promise: Promise) {
        try {
            val count = DirectBootAlarmHelper.clearAllAlarms(reactApplicationContext)
            promise.resolve(count)
        } catch (e: Exception) {
            Log.e(TAG, "clearAllDirectBootAlarms hatası", e)
            promise.resolve(0)
        }
    }

    /**
     * Android 14+ Tam Ekran Bildirim (FullScreenIntent) iznini sorgula (v2.0.1).
     */
    @ReactMethod
    fun canUseFullScreenIntent(promise: Promise) {
        try {
            val context = reactApplicationContext
            val canFSI = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                nm?.canUseFullScreenIntent() ?: true
            } else {
                true
            }
            promise.resolve(canFSI)
        } catch (e: Exception) {
            Log.e(TAG, "canUseFullScreenIntent hatası", e)
            promise.resolve(true)
        }
    }

    /**
     * Android 14+ Tam Ekran Bildirim İzinleri Ayar Ekranını Aç (v2.0.1).
     */
    @ReactMethod
    fun openFullScreenIntentSettings(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
                        data = Uri.parse("package:${context.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    promise.resolve(true)
                    return
                } catch (_e: Exception) {
                    // Fallback to app details
                }
            }

            val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(fallbackIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "openFullScreenIntentSettings hatası", e)
            promise.resolve(false)
        }
    }

    /**
     * Pil optimizasyonu muafiyeti (Doze Mode) durumunu sorgula
     */
    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val context = reactApplicationContext
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val isIgnoring = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pm?.isIgnoringBatteryOptimizations(context.packageName) ?: false
            } else {
                true
            }
            promise.resolve(isIgnoring)
        } catch (e: Exception) {
            Log.e(TAG, "isIgnoringBatteryOptimizations hatası", e)
            promise.resolve(false)
        }
    }

    /**
     * Kesin alarm (Exact Alarm) izni durumunu sorgula (Android 12+)
     */
    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        try {
            val context = reactApplicationContext
            val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            val canSchedule = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                am?.canScheduleExactAlarms() ?: false
            } else {
                true
            }
            promise.resolve(canSchedule)
        } catch (e: Exception) {
            Log.e(TAG, "canScheduleExactAlarms hatası", e)
            promise.resolve(true)
        }
    }

    /**
     * Doğrudan Pil Optimizasyonu Muafiyeti Sistemi Diyalogunu Aç (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
     */
    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "requestIgnoreBatteryOptimizations hatası", e)
            try {
                // Fallback: Genel Pil Ayarlarını Aç
                val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(fallbackIntent)
                promise.resolve(true)
            } catch (e2: Exception) {
                promise.resolve(false)
            }
        }
    }

    /**
     * Üreticiye Özel Otomatik Başlatma (Auto-start) Ayarlarını Aç
     */
    @ReactMethod
    fun openOEMAutostartSettings(promise: Promise) {
        val context = reactApplicationContext
        val autoStartIntents = listOf(
            // Xiaomi / Redmi / Poco (MIUI & HyperOS)
            Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")),
            Intent("miui.intent.action.OP_AUTO_START").addCategory(Intent.CATEGORY_DEFAULT),
            // Huawei / Honor (EMUI)
            Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")),
            Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.bootstart.BootStartActivity")),
            Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity")),
            // Oppo / Realme (ColorOS)
            Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")),
            Intent().setComponent(ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")),
            Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")),
            // Vivo / iQOO (Funtouch OS / OriginOS)
            Intent().setComponent(ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")),
            Intent().setComponent(ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")),
            Intent().setComponent(ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager")),
            // Samsung (One UI)
            Intent().setComponent(ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm", "com.samsung.android.sm.battery.ui.BatteryActivity")),
            // OnePlus (OxygenOS)
            Intent().setComponent(ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListAct"))
        )

        for (intent in autoStartIntents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                Log.d(TAG, "openOEMAutostartSettings: Intent başarıyla açıldı: ${intent.component}")
                promise.resolve(true)
                return
            } catch (_e: Exception) {
                // Denemeye devam et
            }
        }

        // Fallback: Uygulama detay ekranı
        try {
            val appDetailsIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(appDetailsIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Üreticiye Özel Arka Plan / Uyku Kısıtlamaları Ekranını Aç
     */
    @ReactMethod
    fun openOEMBatterySettings(promise: Promise) {
        val context = reactApplicationContext
        val batteryIntents = listOf(
            // Xiaomi PowerKeeper (Kısıtlama Yok / No Restrictions)
            Intent().setComponent(ComponentName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity")).apply {
                putExtra("package_name", context.packageName)
                putExtra("package_label", "İlaç Hatırlatıcı")
            },
            // Samsung Battery & Never Sleeping Apps
            Intent().setComponent(ComponentName("com.samsung.android.sm", "com.samsung.android.sm.battery.ui.BatteryActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity")),
            // Huawei PowerGenie / Battery
            Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.power.ui.HwPowerManagerActivity")),
            // Standart Battery Optimizations
            Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
        )

        for (intent in batteryIntents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                Log.d(TAG, "openOEMBatterySettings: Intent başarıyla açıldı: ${intent.component}")
                promise.resolve(true)
                return
            } catch (_e: Exception) {
                // Denemeye devam et
            }
        }

        try {
            val appDetailsIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(appDetailsIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Xiaomi / OEM Arka Planda Açılır Pencere Gösterme (Display Pop-up) İzin Ekranını Aç
     */
    @ReactMethod
    fun openOEMPopupSettings(promise: Promise) {
        val context = reactApplicationContext
        val popupIntents = listOf(
            // Xiaomi MIUI / HyperOS Permissions Editor
            Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity")
                putExtra("extra_pkgname", context.packageName)
            },
            Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.AppPermissionsEditorActivity")
                putExtra("extra_pkgname", context.packageName)
            },
            // Android 14+ Full Screen Intent
            Intent("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT").apply {
                data = Uri.parse("package:${context.packageName}")
            }
        )

        for (intent in popupIntents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                Log.d(TAG, "openOEMPopupSettings: Intent başarıyla açıldı")
                promise.resolve(true)
                return
            } catch (_e: Exception) {
                // Denemeye devam et
            }
        }

        try {
            val appDetailsIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(appDetailsIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * AlarmReceiver'in NotificationManagerCompat ile attigi TAM EKRAN bildirimini iptal et.
     *
     * O bildirim integer bir id ile (medicineId/reminderTimeId hash'i) atiliyor ve
     * setOngoing(true) + setAutoCancel(false) oldugu icin ne notifee ne de kullanici
     * kapatabiliyordu. JS tarafi ayni id'yi uretemedigi icin bu kopru sart.
     */
    @ReactMethod
    fun cancelAlarmNotification(
        medicineId: String,
        reminderTimeId: String,
        alarmKind: String?,
        promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            val kind = if (alarmKind == AlarmReceiver.KIND_SNOOZE) {
                AlarmReceiver.KIND_SNOOZE
            } else {
                AlarmReceiver.KIND_MAIN
            }
            val notificationId =
                AlarmReceiver.buildNotificationId(medicineId, reminderTimeId, kind)
            NotificationManagerCompat.from(context).cancel(notificationId)
            Log.d(TAG, "cancelAlarmNotification: iptal edildi (id=$notificationId, $medicineId/$reminderTimeId, kind=$kind)")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "cancelAlarmNotification hatasi", e)
            promise.resolve(false)
        }
    }

    /**
     * Tüm sistem bildirimlerini (Native NotificationManager dahil) ve döngüsel sesleri sustur
     */
    @ReactMethod
    fun dismissAllNativeNotifications(promise: Promise) {
        try {
            val context = reactApplicationContext
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.cancelAll()
            Log.d(TAG, "dismissAllNativeNotifications: All notifications cancelled")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "dismissAllNativeNotifications hatası", e)
            promise.resolve(false)
        }
    }

    /**
     * Kilit ekranı üzerindeki Aktivite bayraklarını sıfırla (Pencereyi normale döndür)
     */
    @ReactMethod
    fun clearLockScreenFlags(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity != null) {
            activity.runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                        activity.setShowWhenLocked(false)
                        activity.setTurnScreenOn(false)
                    }
                    @Suppress("DEPRECATION")
                    activity.window?.clearFlags(
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                    )
                    MainActivity.alarmWindowActive = false
                    Log.d(TAG, "clearLockScreenFlags: Lockscreen flags cleared")
                    promise.resolve(true)
                } catch (e: Exception) {
                    Log.e(TAG, "clearLockScreenFlags error", e)
                    promise.resolve(false)
                }
            }
        } else {
            promise.resolve(false)
        }
    }

    /**
     * Uygulama penceresini kilit ekranı arkasına iade et (moveTaskToBack)
     */
    @ReactMethod
    fun moveAppToBack(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity != null) {
            activity.runOnUiThread {
                try {
                    activity.moveTaskToBack(true)
                    promise.resolve(true)
                } catch (e: Exception) {
                    promise.resolve(false)
                }
            }
        } else {
            promise.resolve(false)
        }
    }

    /**
     * Cihaz Üretici ve Donanım Kalkanı Bilgilerini JS'e Döndür
     */
    @ReactMethod
    fun getOEMShieldInfo(promise: Promise) {
        try {
            val context = reactApplicationContext
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

            val isIgnoringBattery = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pm?.isIgnoringBatteryOptimizations(context.packageName) ?: false
            } else {
                true
            }

            val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                am?.canScheduleExactAlarms() ?: false
            } else {
                true
            }

            val canFSI = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
                nm?.canUseFullScreenIntent() ?: true
            } else {
                true
            }

            val map = Arguments.createMap().apply {
                putString("manufacturer", Build.MANUFACTURER.lowercase())
                putString("brand", Build.BRAND.lowercase())
                putString("model", Build.MODEL)
                putInt("sdkVersion", Build.VERSION.SDK_INT)
                putBoolean("isIgnoringBattery", isIgnoringBattery)
                putBoolean("canScheduleExactAlarms", canExact)
                putBoolean("canUseFullScreenIntent", canFSI)
            }

            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "getOEMShieldInfo hatası", e)
            promise.resolve(Arguments.createMap())
        }
    }

    /**
     * Direct Boot DE SharedPreferences'ta kayıtlı alarm sayısını döner (v1.9.3).
     */
    @ReactMethod
    fun getDirectBootAlarmCount(promise: Promise) {
        try {
            val count = DirectBootAlarmHelper.getAlarmCount(reactApplicationContext)
            promise.resolve(count)
        } catch (e: Exception) {
            Log.e(TAG, "getDirectBootAlarmCount hatası", e)
            promise.resolve(0)
        }
    }

    /**
     * STREAM_ALARM ses seviyesini sorgular (v1.9.3).
     */
    @ReactMethod
    fun getAlarmStreamVolume(promise: Promise) {
        try {
            val am = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            if (am == null) {
                promise.resolve(null)
                return
            }
            val current = am.getStreamVolume(AudioManager.STREAM_ALARM)
            val max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            val percent = if (max > 0) ((current.toDouble() / max.toDouble()) * 100).toInt() else 0

            val map = Arguments.createMap().apply {
                putInt("currentVolume", current)
                putInt("maxVolume", max)
                putInt("volumePercent", percent)
                putBoolean("isMuted", current == 0)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "getAlarmStreamVolume hatası", e)
            promise.resolve(null)
        }
    }

    /**
     * Hayati ilaçlar için STREAM_ALARM ses seviyesinin minimum oranda (varsayılan %70)
     * duyulabilir olmasını sağlar (v1.9.3).
     */
    @ReactMethod
    fun ensureSafeAlarmVolume(minRatio: Double, promise: Promise) {
        try {
            val am = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            if (am == null) {
                promise.resolve(false)
                return
            }
            val max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            val current = am.getStreamVolume(AudioManager.STREAM_ALARM)
            val ratio = if (minRatio in 0.1..1.0) minRatio else 0.7
            val targetMinVolume = (max * ratio).toInt().coerceAtLeast(1)

            val map = Arguments.createMap().apply {
                putInt("previousVolume", current)
                putInt("maxVolume", max)
            }

            if (current < targetMinVolume) {
                if (cachedPreviousAlarmVolume == null) {
                    cachedPreviousAlarmVolume = current
                }
                am.setStreamVolume(AudioManager.STREAM_ALARM, targetMinVolume, 0)
                map.putInt("currentVolume", targetMinVolume)
                map.putBoolean("wasAdjusted", true)
                Log.i(TAG, "ensureSafeAlarmVolume: Alarm sesi $current -> $targetMinVolume seviyesine yükseltildi")
            } else {
                map.putInt("currentVolume", current)
                map.putBoolean("wasAdjusted", false)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "ensureSafeAlarmVolume hatası", e)
            promise.resolve(false)
        }
    }

    /**
     * Alarm susturulduğunda veya ertelendiğinde daha önce yükseltilmiş olan ses seviyesini
     * kullanıcının orijinal tercihine geri döndürür (v1.9.4).
     */
    @ReactMethod
    fun restoreAlarmVolume(promise: Promise) {
        try {
            val prev = cachedPreviousAlarmVolume
            if (prev != null) {
                val am = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                am?.setStreamVolume(AudioManager.STREAM_ALARM, prev, 0)
                Log.i(TAG, "restoreAlarmVolume: Alarm sesi eski değerine ($prev) geri yüklendi")
                cachedPreviousAlarmVolume = null
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "restoreAlarmVolume hatası", e)
            promise.resolve(false)
        }
    }
}

