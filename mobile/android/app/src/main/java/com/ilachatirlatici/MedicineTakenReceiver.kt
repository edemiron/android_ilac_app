package com.ilachatirlatici

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * Widget üzerindeki "Aldım" butonunun hedefi.
 *
 * NEDEN AYRI BİR RECEIVER?
 * ------------------------
 * Bu iş eskiden MedicineWidgetProvider.onReceive() içinde yapılıyordu ve iki
 * sorunu vardı:
 *
 *   1. Provider, hiçbir yerde dinlenmeyen bir MEDICINE_TAKEN_FROM_WIDGET
 *      broadcast'i yayınlıyordu. Yani buton hiçbir şey yapmıyordu — kullanıcı
 *      dozu aldığını işaretlediğini sanıyor, kayıt hiç oluşmuyordu.
 *   2. Custom action, provider'ın exported intent-filter'ındaydı; cihazdaki
 *      herhangi bir uygulama sahte "ilaç alındı" broadcast'i gönderebiliyordu.
 *
 * AppWidgetProvider sistem yayınlarını alabilmek için exported olmak zorunda.
 * Bu receiver ise exported=false: yalnızca kendi PendingIntent'imiz (explicit
 * intent, uygulamamızın kimliğiyle gönderilir) buraya ulaşabilir.
 *
 * Aksiyon SharedPreferences'taki bir kuyruğa yazılır. React Native tarafı ön
 * plana geldiğinde kuyruğu boşaltıp logMedicineTaken() çalıştırır; böylece
 * uygulama kapalıyken basılan buton da kaybolmaz.
 */
class MedicineTakenReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_MEDICINE_TAKEN = "com.ilachatirlatici.MEDICINE_TAKEN"
        const val KEY_PENDING_ACTIONS = "pending_taken_actions"

        private const val TAG = "MedicineTakenReceiver"

        /** Kuyruk sınırsız büyümesin (uygulama uzun süre açılmazsa). */
        private const val MAX_PENDING = 50
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_MEDICINE_TAKEN) return

        val medicineId = intent.getStringExtra("medicine_id")
        val reminderTimeId = intent.getStringExtra("reminder_time_id")

        if (medicineId.isNullOrEmpty() || reminderTimeId.isNullOrEmpty()) {
            Log.w(TAG, "Eksik parametre — aksiyon yok sayildi")
            return
        }

        try {
            enqueueAction(context, medicineId, reminderTimeId)
            markTakenInWidgetCache(context, medicineId, reminderTimeId)
            refreshWidgets(context)
            Log.d(TAG, "Aldim aksiyonu kuyruga alindi")
        } catch (e: Exception) {
            Log.e(TAG, "Aldim aksiyonu islenemedi", e)
        }
    }

    /**
     * Aksiyonu kuyruğa ekler. Aynı (medicineId, reminderTimeId) çifti zaten
     * kuyruktaysa tekrar eklenmez — çift kayıt oluşmasın.
     */
    private fun enqueueAction(context: Context, medicineId: String, reminderTimeId: String) {
        val prefs = context.getSharedPreferences(MedicineWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
        val existing = JSONArray(prefs.getString(KEY_PENDING_ACTIONS, "[]") ?: "[]")

        for (i in 0 until existing.length()) {
            val item = existing.optJSONObject(i) ?: continue
            if (item.optString("medicineId") == medicineId &&
                item.optString("reminderTimeId") == reminderTimeId
            ) {
                return
            }
        }

        if (existing.length() >= MAX_PENDING) {
            Log.w(TAG, "Bekleyen aksiyon kuyrugu dolu, en eskisi dusuruluyor")
            existing.remove(0)
        }

        existing.put(
            JSONObject().apply {
                put("medicineId", medicineId)
                put("reminderTimeId", reminderTimeId)
                put("takenAt", System.currentTimeMillis())
            }
        )

        prefs.edit().putString(KEY_PENDING_ACTIONS, existing.toString()).apply()
    }

    /**
     * Widget önbelleğinde ilgili kaydı taken işaretler; kullanıcı RN tarafı
     * devreye girmeden de anında geri bildirim görür.
     */
    private fun markTakenInWidgetCache(
        context: Context,
        medicineId: String,
        reminderTimeId: String
    ) {
        val prefs = context.getSharedPreferences(MedicineWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
        val medicines = JSONArray(
            prefs.getString(MedicineWidgetProvider.KEY_MEDICINES, "[]") ?: "[]"
        )

        for (i in 0 until medicines.length()) {
            val medicine = medicines.optJSONObject(i) ?: continue
            if (medicine.optString("id") == medicineId &&
                medicine.optString("reminderTimeId") == reminderTimeId
            ) {
                medicine.put("isTaken", true)
                break
            }
        }

        prefs.edit().putString(MedicineWidgetProvider.KEY_MEDICINES, medicines.toString()).apply()
    }

    private fun refreshWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = ComponentName(context, MedicineWidgetProvider::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        if (appWidgetIds.isNotEmpty()) {
            MedicineWidgetProvider().onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }
}
