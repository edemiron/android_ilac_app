package com.ilachatirlatici

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class MedicineWidgetProvider : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "MedicineWidgetPrefs"
        const val KEY_MEDICINES = "widget_medicines"
        const val ACTION_MEDICINE_TAKEN = "com.ilachatirlatici.MEDICINE_TAKEN"
        
        // Widget boyutları
        const val WIDGET_SMALL = "small"
        const val WIDGET_MEDIUM = "medium" 
        const val WIDGET_LARGE = "large"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        when (intent.action) {
            ACTION_MEDICINE_TAKEN -> {
                val medicineId = intent.getStringExtra("medicine_id")
                val reminderTimeId = intent.getStringExtra("reminder_time_id")
                // Burada ilaç alındı bildirimi gönderilecek
                // React Native tarafına broadcast gönder
                val takenIntent = Intent("com.ilachatirlatici.MEDICINE_TAKEN_FROM_WIDGET").apply {
                    putExtra("medicine_id", medicineId)
                    putExtra("reminder_time_id", reminderTimeId)
                }
                context.sendBroadcast(takenIntent)
            }
        }
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // Widget boyutunu al
        val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)
        
        // Boyuta göre layout seç
        val layoutRes = when {
            minWidth >= 300 && minHeight >= 300 -> R.layout.widget_large
            minWidth >= 300 -> R.layout.widget_medium
            else -> R.layout.widget_small
        }

        val views = RemoteViews(context.packageName, layoutRes)
        
        // Verileri al
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val medicinesJson = prefs.getString(KEY_MEDICINES, "[]") ?: "[]"
        val medicines = JSONArray(medicinesJson)
        
        // Widget'ı güncelle
        updateWidgetViews(context, views, medicines, layoutRes)
        
        // Ana uygulamaya tıklama intent'i
        val launchIntent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun updateWidgetViews(
        context: Context,
        views: RemoteViews,
        medicines: JSONArray,
        layoutRes: Int
    ) {
        when (layoutRes) {
            R.layout.widget_small -> updateSmallWidget(views, medicines)
            R.layout.widget_medium -> updateMediumWidget(views, medicines)
            R.layout.widget_large -> updateLargeWidget(context, views, medicines)
        }
    }

    private fun updateSmallWidget(views: RemoteViews, medicines: JSONArray) {
        val count = medicines.length()

        if (count == 0) {
            views.setTextViewText(R.id.medicine_name, "İlaç yok")
            views.setTextViewText(R.id.medicine_time, "")
            views.setTextViewText(R.id.medicine_dosage, "Bugün için ilaç yok")
            return
        }

        // Tümü alındı mı kontrol et
        var allTaken = true
        for (i in 0 until count) {
            val medicine = medicines.getJSONObject(i)
            if (!medicine.optBoolean("isTaken", false)) {
                allTaken = false
                break
            }
        }

        if (allTaken) {
            views.setTextViewText(R.id.medicine_name, "Tümü alındı ✓")
            views.setTextViewText(R.id.medicine_time, "")
            views.setTextViewText(R.id.medicine_dosage, "Bugün tüm ilaçlarınızı aldınız")
            return
        }

        // İlk alınmamış ilacı göster
        for (i in 0 until count) {
            val medicine = medicines.getJSONObject(i)
            if (!medicine.optBoolean("isTaken", false)) {
                val name = medicine.optString("name", "İlaç")
                val time = medicine.optString("time", "")
                val dosage = medicine.optString("dosage", "")
                val color = medicine.optInt("color", 0xFF4ECDC4.toInt())

                views.setTextViewText(R.id.medicine_name, name)
                views.setTextViewText(R.id.medicine_time, time)
                views.setTextViewText(R.id.medicine_dosage, dosage)
                views.setInt(R.id.medicine_icon, "setColorFilter", color)
                return
            }
        }
    }

    private fun updateMediumWidget(views: RemoteViews, medicines: JSONArray) {
        val count = medicines.length()

        if (count == 0) {
            views.setTextViewText(R.id.title, "Bugün için ilaç yok")
            views.setViewVisibility(R.id.medicine_list, android.view.View.GONE)
            return
        }

        // Tümü alındı mı kontrol et
        var allTaken = true
        for (i in 0 until count) {
            val medicine = medicines.getJSONObject(i)
            if (!medicine.optBoolean("isTaken", false)) {
                allTaken = false
                break
            }
        }

        if (allTaken) {
            views.setTextViewText(R.id.title, "Tümü alındı ✓")
            views.setViewVisibility(R.id.medicine_list, android.view.View.GONE)
            return
        }

        views.setTextViewText(R.id.title, "Bugünkü İlaçlar")
        views.setViewVisibility(R.id.medicine_list, android.view.View.VISIBLE)

        // İlk 3 alınmamış ilacı göster
        var displayedCount = 0
        for (i in 0 until count) {
            if (displayedCount >= 3) break
            val medicine = medicines.getJSONObject(i)
            if (medicine.optBoolean("isTaken", false)) continue

            val name = medicine.optString("name")
            val time = medicine.optString("time")
            val isTaken = medicine.optBoolean("isTaken", false)
            val statusSuffix = if (isTaken) " ✓" else ""

            when (displayedCount) {
                0 -> {
                    views.setTextViewText(R.id.med1_name, name + statusSuffix)
                    views.setTextViewText(R.id.med1_time, time)
                    views.setViewVisibility(R.id.med1, android.view.View.VISIBLE)
                }
                1 -> {
                    views.setTextViewText(R.id.med2_name, name + statusSuffix)
                    views.setTextViewText(R.id.med2_time, time)
                    views.setViewVisibility(R.id.med2, android.view.View.VISIBLE)
                }
                2 -> {
                    views.setTextViewText(R.id.med3_name, name + statusSuffix)
                    views.setTextViewText(R.id.med3_time, time)
                    views.setViewVisibility(R.id.med3, android.view.View.VISIBLE)
                }
            }
            displayedCount++
        }

        // Kalan ilaçları gizle
        for (i in displayedCount until 3) {
            when (i) {
                0 -> views.setViewVisibility(R.id.med1, android.view.View.GONE)
                1 -> views.setViewVisibility(R.id.med2, android.view.View.GONE)
                2 -> views.setViewVisibility(R.id.med3, android.view.View.GONE)
            }
        }

        // Daha fazla varsa göster
        val remaining = count - displayedCount
        if (remaining > 0) {
            views.setTextViewText(R.id.more_count, "+$remaining daha")
            views.setViewVisibility(R.id.more_count, android.view.View.VISIBLE)
        } else {
            views.setViewVisibility(R.id.more_count, android.view.View.GONE)
        }
    }

    private fun updateLargeWidget(context: Context, views: RemoteViews, medicines: JSONArray) {
        val count = medicines.length()

        if (count == 0) {
            views.setTextViewText(R.id.title, "Bugün için ilaç yok")
            views.setViewVisibility(R.id.medicine_list, android.view.View.GONE)
            return
        }

        // Tümü alındı mı kontrol et
        var allTaken = true
        for (i in 0 until count) {
            val medicine = medicines.getJSONObject(i)
            if (!medicine.optBoolean("isTaken", false)) {
                allTaken = false
                break
            }
        }

        if (allTaken) {
            views.setTextViewText(R.id.title, "Tümü alındı ✓")
            views.setViewVisibility(R.id.medicine_list, android.view.View.GONE)
            return
        }

        views.setTextViewText(R.id.title, "Bugünkü İlaçlar (${count})")
        views.setViewVisibility(R.id.medicine_list, android.view.View.VISIBLE)

        // İlk 5 alınmamış ilacı göster
        var displayedCount = 0
        for (i in 0 until count) {
            if (displayedCount >= 5) break
            val medicine = medicines.getJSONObject(i)
            if (medicine.optBoolean("isTaken", false)) continue

            val time = medicine.optString("time")
            val name = medicine.optString("name")
            val rowId = when (displayedCount) {
                0 -> R.id.med1
                1 -> R.id.med2
                2 -> R.id.med3
                3 -> R.id.med4
                4 -> R.id.med5
                else -> null
            }

            rowId?.let { id ->
                views.setTextViewText(id, "$time - $name")
                views.setViewVisibility(id, android.view.View.VISIBLE)

                // Alındı butonu (sadece alınmamış ilaçlar için)
                val takenButtonId = when (displayedCount) {
                    0 -> R.id.med1_taken
                    1 -> R.id.med2_taken
                    2 -> R.id.med3_taken
                    3 -> R.id.med4_taken
                    4 -> R.id.med5_taken
                    else -> null
                }

                takenButtonId?.let { buttonId ->
                    val takenIntent = Intent(context, MedicineWidgetProvider::class.java).apply {
                        action = ACTION_MEDICINE_TAKEN
                        putExtra("medicine_id", medicine.optString("id"))
                        putExtra("reminder_time_id", medicine.optString("reminderTimeId"))
                    }
                    val takenPendingIntent = PendingIntent.getBroadcast(
                        context, i, takenIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(buttonId, takenPendingIntent)
                }
            }
            displayedCount++
        }

        // Kalanları gizle
        for (i in displayedCount until 5) {
            val rowId = when (i) {
                0 -> R.id.med1
                1 -> R.id.med2
                2 -> R.id.med3
                3 -> R.id.med4
                4 -> R.id.med5
                else -> null
            }
            rowId?.let { views.setViewVisibility(it, android.view.View.GONE) }
        }
    }

    // React Native'den çağrılacak
    fun updateWidgetData(context: Context, medicinesJson: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_MEDICINES, medicinesJson).apply()
        
        // Widget'ları güncelle
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = android.content.ComponentName(context, MedicineWidgetProvider::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
        
        onUpdate(context, appWidgetManager, appWidgetIds)
    }
}
