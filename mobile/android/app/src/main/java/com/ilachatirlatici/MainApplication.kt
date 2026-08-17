@file:Suppress("DEPRECATION")

package com.ilachatirlatici

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.content.res.Configuration
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

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
    
    // KRİTİK: Alarm kanalını native olarak oluştur (USAGE_ALARM + bypassDnd)
    // Notifee'nin createChannel API'si AudioAttributes.USAGE_ALARM desteklemiyor
    // Bu yüzden kanalı burada oluşturuyoruz - notifee aynı ID ile tekrar oluşturmaya çalışınca
    // Android mevcut kanalı korur (kanallar oluşturulduktan sonra değiştirilemez)
    createAlarmNotificationChannel()
    
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
    
    // WorkManager: Her 15 dakikada bir alarmları kontrol et ve yeniden planla
    // Bu sayede BootReceiver başlamazsa bile alarmlar kaçırılmaz
    scheduleAlarmCheckWorker()
  }
  
  private fun createAlarmNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(NotificationManager::class.java)
      
      // Eski v3 kanalını sil (yanlış AudioAttributes ile oluşturulmuştu)
      try {
        notificationManager.deleteNotificationChannel("medicine-alarms-v3")
      } catch (_: Exception) {}
      
      // Yeni v4 alarm kanalı - USAGE_ALARM ile
      val alarmChannel = NotificationChannel(
        "medicine-alarms-v4",
        "Ilac Alarmlari",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Kritik ilac hatirlatmalari - Sessiz modda bile calar"
        
        // KRİTİK: AudioAttributes.USAGE_ALARM - bu tam ekran intent için gerekli
        val alarmSound = Uri.parse("android.resource://${packageName}/raw/alarm")
        val audioAttributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
        setSound(alarmSound, audioAttributes)
        
        // DND bypass
        setBypassDnd(true)
        
        // Kilit ekranında göster
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        
        // Titreşim
        enableVibration(true)
        vibrationPattern = longArrayOf(500, 1000, 500, 1000, 500, 1000)
        
        // LED
        enableLights(true)
        lightColor = 0xFFFF0000.toInt()
      }
      
      notificationManager.createNotificationChannel(alarmChannel)
      
      // Hatırlatma kanalı da v4 olarak oluştur
      val reminderChannel = NotificationChannel(
        "medicine-reminders-v4",
        "Ilac Hatirlatmalari",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Normal ilac hatirlatmalari"
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        enableVibration(true)
      }
      
      notificationManager.createNotificationChannel(reminderChannel)
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }

  private fun scheduleAlarmCheckWorker() {
    try {
      val periodicWorkRequest = PeriodicWorkRequestBuilder<AlarmCheckWorker>(
        15, TimeUnit.MINUTES,         // Her 15 dakikada bir çalış
        5,  TimeUnit.MINUTES          // Esnek pencere: 15-20 dakika arası
      ).build()

      WorkManager.getInstance(this).enqueueUniquePeriodicWork(
        AlarmCheckWorker.WORK_NAME,
        ExistingPeriodicWorkPolicy.KEEP, // Zaten varsa dokunma (duplicate önle)
        periodicWorkRequest
      )

      android.util.Log.d("WorkManager", "AlarmCheckWorker scheduled successfully")
    } catch (e: Exception) {
      android.util.Log.e("WorkManager", "Failed to schedule AlarmCheckWorker", e)
    }
  }
}
