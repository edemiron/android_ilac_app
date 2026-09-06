package com.ilachatirlatici

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.util.Log
import org.json.JSONObject

/**
 * DirectBootAlarmHelper — Direct Boot (FBE) Güvenlik Kalkanı (v1.9.3).
 *
 * ── Neden bu sınıf var ───────────────────────────────────────────────────
 * Cihaz yeniden başlatıldığında, kullanıcı ilk kez PIN/Deseni girene kadar
 * Android Credential Encrypted (CE) depolamayı kilitli tutar. Standart
 * `AsyncStorage` ve SQLite bu yüzden kilitlidir ve okunamaz.
 *
 * Bu sınıf, alarmların hafif bir kopyasını `createDeviceProtectedStorageContext()`
 * ile cihaz şifrelenmemişken bile okunabilen Device Protected (DE)
 * SharedPreferences alanında tutar.
 *
 * `BootReceiver` `LOCKED_BOOT_COMPLETED` aldığında, React Native veya
 * HeadlessJS'in CE depolamaya erişmesini beklemeden buradaki alarmları
 * doğrudan `AlarmManager.setAlarmClock` ile kernel RTC seviyesinde kurar.
 */
object DirectBootAlarmHelper {
    private const val TAG = "DirectBootAlarm"
    private const val PREFS_NAME = "direct_boot_alarms"

    /**
     * Device Protected (DE) SharedPreferences örneği döner.
     * Android N (API 24)+ cihazlarda DE context kullanılır.
     */
    fun getPrefs(context: Context): SharedPreferences {
        val deContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                context.createDeviceProtectedStorageContext()
            } catch (e: Exception) {
                Log.w(TAG, "createDeviceProtectedStorageContext failed, falling back to standard context", e)
                context
            }
        } else {
            context
        }
        return deContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun buildKey(medicineId: String, reminderTimeId: String, kind: String): String {
        return "${medicineId}_${reminderTimeId}_${kind}"
    }

    /**
     * Bir alarmı DE SharedPreferences'a kaydet.
     */
    fun saveAlarm(
        context: Context,
        triggerTimeMs: Long,
        medicineId: String,
        reminderTimeId: String,
        kind: String
    ) {
        try {
            val key = buildKey(medicineId, reminderTimeId, kind)
            val json = JSONObject().apply {
                put("triggerTimeMs", triggerTimeMs)
                put("medicineId", medicineId)
                put("reminderTimeId", reminderTimeId)
                put("kind", kind)
                put("updatedAt", System.currentTimeMillis())
            }
            getPrefs(context).edit().putString(key, json.toString()).apply()
            Log.d(TAG, "Saved alarm to DE storage: $key -> $triggerTimeMs")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save alarm to DE storage", e)
        }
    }

    /**
     * Bir alarmı DE SharedPreferences'tan kaldır.
     */
    fun removeAlarm(
        context: Context,
        medicineId: String,
        reminderTimeId: String,
        kind: String
    ) {
        try {
            val key = buildKey(medicineId, reminderTimeId, kind)
            getPrefs(context).edit().remove(key).apply()
            Log.d(TAG, "Removed alarm from DE storage: $key")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to remove alarm from DE storage", e)
        }
    }

    /**
     * Cihaz yeniden başladığında (LOCKED_BOOT_COMPLETED veya BOOT_COMPLETED),
     * DE SharedPreferences'taki tüm geçerli alarmları doğrudan AlarmManager'a kurar.
     */
    fun reArmAllAlarms(context: Context): Int {
        var armedCount = 0
        try {
            val prefs = getPrefs(context)
            val allEntries = prefs.all
            val now = System.currentTimeMillis()
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

            if (alarmManager == null) {
                Log.e(TAG, "AlarmManager not available during re-arm")
                return 0
            }

            val editor = prefs.edit()
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            for ((key, value) in allEntries) {
                if (value !is String) continue
                try {
                    val obj = JSONObject(value)
                    val triggerTimeMs = obj.getLong("triggerTimeMs")
                    val medicineId = obj.getString("medicineId")
                    val reminderTimeId = obj.getString("reminderTimeId")
                    val kind = obj.optString("kind", AlarmReceiver.KIND_MAIN)

                    // 24 saatten daha eski geçmiş alarmları temizle
                    if (triggerTimeMs < now - 86400000L) {
                        editor.remove(key)
                        continue
                    }

                    // Sadece gelecekteki alarmları kur
                    if (triggerTimeMs > now) {
                        val triggerIntent = Intent(context, AlarmReceiver::class.java).apply {
                            action = AlarmReceiver.ACTION_ALARM_TRIGGER
                            putExtra("medicineId", medicineId)
                            putExtra("reminderTimeId", reminderTimeId)
                            putExtra("scheduledTime", triggerTimeMs.toString())
                            putExtra("isAlarmTrigger", true)
                            putExtra(AlarmReceiver.EXTRA_ALARM_KIND, kind)
                        }

                        val requestCode = AlarmReceiver.buildNotificationId(medicineId, reminderTimeId, kind)
                        val pendingIntent = PendingIntent.getBroadcast(context, requestCode, triggerIntent, flags)

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
                        val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTimeMs, showIntent)

                        alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
                        armedCount++
                        Log.d(TAG, "Re-armed DE alarm: $medicineId ($reminderTimeId, kind=$kind) at $triggerTimeMs")
                    }
                } catch (jsonErr: Exception) {
                    Log.w(TAG, "Malformed DE alarm entry for key: $key", jsonErr)
                    editor.remove(key)
                }
            }
            editor.apply()
        } catch (e: Exception) {
            Log.e(TAG, "reArmAllAlarms failed", e)
        }
        return armedCount
    }

    /**
     * DE SharedPreferences'ta kayıtlı alarm sayısını döner.
     */
    fun getAlarmCount(context: Context): Int {
        return try {
            getPrefs(context).all.size
        } catch (_e: Exception) {
            0
        }
    }
}
