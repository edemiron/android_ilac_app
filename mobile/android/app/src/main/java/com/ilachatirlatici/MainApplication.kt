@file:Suppress("DEPRECATION")

package com.ilachatirlatici

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.content.res.Configuration
import androidx.work.WorkManager

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  @Deprecated("ReactApplication still exposes ReactNativeHost on React Native 0.81.")
  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Widget veri modülünü ekle
              add(WidgetPackage())
              // Alarm modülünü ekle (ekran kapalıyken uygulamayı açmak için)
              add(AlarmPackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    
    // KRİTİK: Alarm ve bildirim kanallarını native olarak oluştur
    createAlarmNotificationChannel()
    
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
    
    // ⚠️ v1.7.7 — PERIYODIK AlarmCheckWorker KALDIRILDI.
    // Eski kurulumlarda kuyruga alinmis is de iptal edilir.
    cancelLegacyAlarmCheckWorker()
  }
  
  /**
   * KANAL KIMLIKLERININ TEK KAYNAGI: `src/utils/notifications/channels.ts`.
   *
   * Burada YALNIZCA JS calismadan once gerekli olan kanallar olusturulur:
   *   - FCM varsayilan kanali (`res/values/strings.xml` ile ayni olmali)
   *   - bakici / uzaktan hatirlatici push kanallari
   * Geri kalan her sey (alarm ailesi, melodi kanallari, tam ekran tasiyicisi)
   * JS tarafinda `createNotificationChannels()` ile olusturulur.
   *
   * Kimlikler ayrisirsa `notifications.channelIds.test.ts` kirilir.
   *
   * NOT: eskiden burada `medicine-alarms-v4` / `medicine-reminders-v4` gibi
   * AYRI bir kanal ailesi uretiliyordu; JS'in ailesiyle yarisiyor ve push
   * bildirimleri eski kanala dusuyordu. Yayin oncesi birlestirildi.
   */
  private fun createAlarmNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(NotificationManager::class.java)

      // Eski surumlerden kalan kanallari sil (JS tarafi da ayni temizligi yapar).
      val legacyChannelIds = listOf(
        "medicine-alarms-v3", "medicine-alarms-v4", "medicine-alarms-v5",
        "medicine-alarms-v6", "medicine-alarms-v7", "medicine-alarms-fsi-v7",
        "medicine-alarms-no-vibration-v7",
        "medicine-reminders-v4", "medicine-reminders-v6", "medicine-reminders-v7",
        "medicine-reminders-no-vibration-v7",
        "caregiver-live-alerts-v1", "caregiver-live-alerts-v6", "caregiver-live-alerts-v7",
        "patient-remote-reminders-v1", "patient-remote-reminders-v7",
        "emergency-sos-v6", "emergency-sos-v7",
        "med_alarms", "open-app-reminders"
      )
      for (legacyId in legacyChannelIds) {
        try {
          notificationManager.deleteNotificationChannel(legacyId)
        } catch (_: Exception) {}
      }

      val notificationAudioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      val reminderSound = Uri.parse("android.resource://${packageName}/raw/sound_crystal_bell")

      // 1. FCM VARSAYILAN KANALI — channels.ts: REMINDER_CHANNEL_ID
      val reminderChannel = NotificationChannel(
        "medicine-reminders-r1",
        "İlaç Hatırlatmaları",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Normal ilac hatirlatmalari"
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        setSound(reminderSound, notificationAudioAttributes)
        enableVibration(true)
      }
      notificationManager.createNotificationChannel(reminderChannel)

      // 2. Bakici canli bildirimleri — channels.ts: CAREGIVER_ALERT_CHANNEL_ID
      val caregiverChannel = NotificationChannel(
        "caregiver-live-alerts-r1",
        "Bakıcı Canlı Bildirimleri",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Hasta ilac aldiginda veya atladiginda bakiciya gelen canli uyarilar"
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        setSound(reminderSound, notificationAudioAttributes)
        enableVibration(true)
        enableLights(true)
        lightColor = 0xFF4ECDC4.toInt()
      }
      notificationManager.createNotificationChannel(caregiverChannel)

      // 3. Hasta uzaktan hatirlatici — channels.ts: PATIENT_REMOTE_REMINDER_CHANNEL_ID
      val patientRemoteChannel = NotificationChannel(
        "patient-remote-reminders-r1",
        "Uzaktan İlaç Hatırlatması",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Yakinlarinizin size gonderdigi ilac hatirlatmalari"
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        setSound(reminderSound, notificationAudioAttributes)
        enableVibration(true)
        enableLights(true)
        lightColor = 0xFFFF6B6B.toInt()
      }
      notificationManager.createNotificationChannel(patientRemoteChannel)
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }

  /**
   * ⚠️ v1.7.7 — PERIYODIK `AlarmCheckWorker` NIYE KALDIRILDI
   * ════════════════════════════════════════════════════════════════════════
   * 15 dakikada bir calisip `BootTaskService` -> `ReRegisterAlarmsTask` ->
   * `reRegisterAllAlarms()` tetikliyordu. Iki sebeple hem FAYDASIZ hem ZARARLI:
   *
   * 1. FAYDASIZ. `AlarmCheckWorker.doWork()` Android 12+ icin
   *    `if (!isAppForeground()) return Result.success()` ile basliyor. Yani
   *    guvenlik agi olarak ise yarayacagi TEK durumda (uygulama arka planda)
   *    hicbir sey yapmiyor. Uygulama on plandayken ise `app_startup` yolu
   *    zaten alarmlari yeniden kurmus oluyor.
   *
   * 2. ZARARLI. `reRegisterAllAlarms` her etkin hatirlatma icin
   *    `scheduleMedicineNotification` cagiriyor, o da ONCE `cancelNotification`
   *    yapiyor. Cihazda olculdu: 15 native alarm 8 saniye icinde UC kez iptal
   *    edilip yeniden kuruldu (logcat'te 122 `scheduleNativeAlarm`). Iptal
   *    o anda CALAN bir alarma denk gelirse calan bildirimi dusurur.
   *
   * Alarm dayanikliligi zaten uc gercek mekanizmayla saglaniyor:
   * `AlarmManager.setAlarmClock` (donanim), notifee TIMESTAMP trigger, ve
   * yeniden baslatmada `BOOT_COMPLETED` -> `reRegisterAllAlarms`.
   *
   * Eski kurulumlarda WorkManager veritabaninda ZATEN kuyruga alinmis
   * periyodik is var; uygulamayi guncellemek onu kendiliginden silmez, bu
   * yuzden isim uzerinden acikca iptal ediliyor.
   */
  private fun cancelLegacyAlarmCheckWorker() {
    try {
      WorkManager.getInstance(this).cancelUniqueWork(AlarmCheckWorker.WORK_NAME)
      android.util.Log.d("WorkManager", "Legacy AlarmCheckWorker cancelled")
    } catch (e: Exception) {
      android.util.Log.e("WorkManager", "Failed to cancel legacy AlarmCheckWorker", e)
    }
  }
}
