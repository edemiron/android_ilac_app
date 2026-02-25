package com.ilachatirlatici

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import org.json.JSONArray
import org.json.JSONObject

class WidgetDataModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WidgetDataModule"
    }

    @ReactMethod
    fun updateWidgetData(medicines: ReadableArray?) {
        try {
            val context = reactApplicationContext

            // Null kontrolü
            if (medicines == null || medicines.size() == 0) {
                // Boş liste gönder - widget temizlensin
                MedicineWidgetProvider().updateWidgetData(context, "[]")
                return
            }

            // JSON array oluştur - org.json kullanarak güvenli serialization
            val jsonArray = JSONArray()

            for (i in 0 until medicines.size()) {
                val medicine = medicines.getMap(i)

                if (medicine != null) {
                    val jsonObject = JSONObject()
                    jsonObject.put("id", medicine.getString("id") ?: "")
                    jsonObject.put("name", medicine.getString("name") ?: "")
                    jsonObject.put("time", medicine.getString("time") ?: "")
                    jsonObject.put("dosage", medicine.getString("dosage") ?: "")
                    jsonObject.put("reminderTimeId", medicine.getString("reminderTimeId") ?: "")

                    // isTaken, isSkipped, isMissed durumları
                    jsonObject.put("isTaken", medicine.getBoolean("isTaken"))
                    jsonObject.put("isSkipped", medicine.getBoolean("isSkipped"))
                    jsonObject.put("isMissed", medicine.getBoolean("isMissed"))

                    // Color için double okuyup int'e çevir - getInt bazı durumlarda crash yapabilir
                    val colorValue = try {
                        when {
                            medicine.hasKey("color") -> {
                                val doubleVal = medicine.getDouble("color")
                                doubleVal.toInt()
                            }
                            else -> -0x123455 // Default color (0xFF4ECDC4 in signed int)
                        }
                    } catch (e: Exception) {
                        -0x123455 // Default color
                    }
                    jsonObject.put("color", colorValue)

                    jsonArray.put(jsonObject)
                }
            }

            // Widget'ı güncelle
            MedicineWidgetProvider().updateWidgetData(context, jsonArray.toString())
        } catch (e: Exception) {
            // Hata durumunda logla ama crash yapma
            android.util.Log.e("WidgetDataModule", "Widget güncellenirken hata", e)
        }
    }

    @ReactMethod
    fun refreshWidget() {
        try {
            val context = reactApplicationContext
            val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
            val componentName = android.content.ComponentName(context, MedicineWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            
            MedicineWidgetProvider().onUpdate(context, appWidgetManager, appWidgetIds)
        } catch (e: Exception) {
            android.util.Log.e("WidgetDataModule", "Widget yenilenirken hata", e)
        }
    }
}
