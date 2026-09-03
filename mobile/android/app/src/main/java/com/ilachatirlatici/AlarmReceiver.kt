package com.ilachatirlatici

import android.app.ActivityOptions
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments

class AlarmReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "AlarmReceiver"
        private const val WAKE_LOCK_TAG = "IlacHatirlatici:AlarmWakeLock"
        private const val WAKE_LOCK_TIMEOUT = 30_000L // 30 saniye ekran açık tut
        const val ACTION_ALARM_TRIGGER = "com.ilachatirlatici.ALARM_TRIGGER"

        /**
         * Tam ekran intent tasiyici bildirimin kanali.
         * SESSIZDIR: sesi notifee bildirimi (kullanicinin sectigi melodi + dongusel ses)
         * ve AlarmScreen'in kendi oynaticisi calar. Bu bildirim yalnizca
         * FullScreenIntent'i tasimak icin vardir; sesli olmasi kilit ekraninda
         * iptal edilemeyen ikinci bir alarm sesi olusturuyordu.
         */
        // Kimliklerin tek kaynagi: src/utils/notifications/channels.ts
        // (ALARM_FSI_CHANNEL_ID). Ayrisirsa notifications.channelIds.test.ts kirilir.
        const val FSI_CHANNEL_ID = "medicine-alarms-fsi-r1"

        /** Tam ekran bildirimin en fazla ne kadar ekranda kalacagi (asili kalmasin). */
        private const val FSI_TIMEOUT_MS = 120_000L

        /** Ana doz alarmi. */
        const val KIND_MAIN = "main"

        /** Erteleme (snooze) alarmi. */
        const val KIND_SNOOZE = "snooze"

        /** Intent extra: alarmin turu (main / snooze). */
        const val EXTRA_ALARM_KIND = "alarmKind"

        /**
         * Hem AlarmManager requestCode'u hem de bildirim id'si olarak kullanilan
         * deterministik id. AlarmModule.cancelAlarmNotification ayni id'yi uretip
         * bu bildirimi JS tarafindan iptal edebilsin diye public.
         *
         * ── v1.7.1: `kind` eklendi ────────────────────────────────────────────
         * Eskiden id yalnizca (medicineId, reminderTimeId) ciftinden turuyordu.
         * Erteleme alarmi da AYNI cifti kullandigi icin requestCode CAKISIYORDU:
         * `PendingIntent.getBroadcast` ayni requestCode + ayni action ile mevcut
         * PendingIntent'i DEGISTIRIYOR, dolayisiyla 5 dakikalik bir erteleme
         * kurmak ayni hatirlatmanin bir sonraki gunku native alarmini
         * SILIYORDU. Ayrica `cancelNativeAlarm` hangisini iptal ettigini
         * ayirt edemiyordu. `kind` tuza olarak eklenerek iki alarm ayri
         * PendingIntent/bildirim uzayina tasindi.
         */
        @JvmStatic
        @JvmOverloads
        fun buildNotificationId(
            medicineId: String,
            reminderTimeId: String,
            kind: String = KIND_MAIN
        ): Int {
            val base = medicineId.hashCode() xor reminderTimeId.hashCode()
            // Ana alarm icin davranis AYNEN korunur (geriye donuk uyumluluk):
            // eski kurulumlarda zaten kurulmus PendingIntent'ler bulunabilir.
            val salted = if (kind == KIND_SNOOZE) base xor KIND_SNOOZE.hashCode() else base
            return salted and 0x7FFFFFFF
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "onReceive triggered with action: $action")

        // v1.7.4 (Faz 0.4): "test-medicine" FALLBACK'İ KALDIRILDI.
        // Eskiden extra yoksa kimlik uydurulur, JS tarafı da bunu "test modu"
        // sayıp doğrulamayı (ilaç var mı, doz zaten alınmış mı, alarm erken mi)
        // ATLARDI. Sahte/eksik bir intent böylece kilit ekranında alarm
        // açtırabiliyordu. Kimlik yoksa yapılacak doğru iş: hiçbir şey.
        val medicineId = intent.getStringExtra("medicineId")
        val reminderTimeId = intent.getStringExtra("reminderTimeId")
        if (medicineId.isNullOrBlank() || reminderTimeId.isNullOrBlank()) {
            Log.w(TAG, "onReceive: medicineId/reminderTimeId yok, alarm YOKSAYILDI (action=$action)")
            return
        }
        val scheduledTime = intent.getStringExtra("scheduledTime") ?: System.currentTimeMillis().toString()
        val alarmKind = intent.getStringExtra(EXTRA_ALARM_KIND) ?: KIND_MAIN

        // 1. EKRANI UYANDIR (WakeLock)
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        try {
            @Suppress("DEPRECATION")
            val wakeLock = powerManager?.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                WAKE_LOCK_TAG
            )
            wakeLock?.acquire(WAKE_LOCK_TIMEOUT)
            Log.d(TAG, "Screen WakeLock acquired for 30s")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire screen wake lock", e)
        }

        // Erteleme mi? JS tarafi bunu bilmek ZORUNDA: AlarmScreen hangi native
        // requestCode uzayini (main / snooze) iptal edecegine buna gore karar
        // veriyor. Eskiden tasinmiyordu; native yoldan acilan bir erteleme
        // ekraninda "Simdi Al" ANA alarmin PendingIntent'ini iptal edip bir
        // sonraki dozun kilit ekrani uyandirmasini dusuruyordu.
        val isSnoozeFlag = if (alarmKind == KIND_SNOOZE) "true" else "false"

        // 2. React Native Event ve Önbelleğe yaz
        try {
            val params = Arguments.createMap().apply {
                putString("medicineId", medicineId)
                putString("reminderTimeId", reminderTimeId)
                putString("scheduledTime", scheduledTime)
                putString("isSnooze", isSnoozeFlag)
            }
            AlarmModule.emitAlarmTriggered(params)
        } catch (e: Exception) {
            Log.d(TAG, "AlarmModule.emitAlarmTriggered fallback: ${e.message}")
        }

        // 3. MainActivity Launch Intent oluştur
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            this.action = Intent.ACTION_VIEW
            this.data = Uri.parse("ilachatirlatici://alarm?medicineId=$medicineId&reminderTimeId=$reminderTimeId&scheduledTime=$scheduledTime&isSnooze=$isSnoozeFlag")
            putExtra("medicineId", medicineId)
            putExtra("reminderTimeId", reminderTimeId)
            putExtra("scheduledTime", scheduledTime)
            putExtra("isSnooze", isSnoozeFlag)
            putExtra("isAlarmTrigger", true)
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            )
        }

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val requestCode = buildNotificationId(medicineId, reminderTimeId, alarmKind)

        val bOptions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ActivityOptions.makeBasic().apply {
                setPendingIntentBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED)
            }.toBundle()
        } else {
            null
        }

        // 4. ONCE FullScreenIntent bildirimi: kilit ekranini asmanin isletim sistemi
        //    tarafindan onaylanan TEK yolu bu. Dogrudan activity baslatma modern
        //    Android'de BAL (background activity launch) tarafindan bloklaniyor:
        //      "Background activity launch blocked! ... (BAL_BLOCK) result code=3"
        try {
            showFullScreenAlarmNotification(context, medicineId, reminderTimeId, scheduledTime, launchIntent, requestCode, flags, bOptions)
        } catch (e: Exception) {
            Log.e(TAG, "showFullScreenAlarmNotification failed", e)
        }

        // 5. Ek olarak dogrudan Activity baslatmayi dene (bazi OEM'lerde calisir,
        //    modern Android'de sessizce BAL_BLOCK alir — bu normaldir, FSI zaten atildi).
        try {
            if (bOptions != null) {
                context.startActivity(launchIntent, bOptions)
            } else {
                context.startActivity(launchIntent)
            }
            Log.d(TAG, "startActivity called for MainActivity")
        } catch (e: Exception) {
            Log.d(TAG, "startActivity from receiver blocked (FSI devrede): ${e.message}")
        }
    }

    private fun showFullScreenAlarmNotification(
        context: Context,
        medicineId: String,
        reminderTimeId: String,
        scheduledTime: String,
        launchIntent: Intent,
        requestCode: Int,
        flags: Int,
        bOptions: android.os.Bundle?
    ) {
        val channelId = FSI_CHANNEL_ID
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && notificationManager != null) {
            val channel = NotificationChannel(
                channelId,
                "İlaç Alarmı (Tam Ekran)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Kilit ekranını uyandıran tam ekran alarm taşıyıcısı (sessiz)"
                enableLights(true)
                // Ses ve titresim BILEREK kapali — bkz. FSI_CHANNEL_ID aciklamasi.
                enableVibration(false)
                setSound(null, null)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Android 14+ : FullScreenIntent izni gercekten var mi?
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && notificationManager != null) {
            if (!notificationManager.canUseFullScreenIntent()) {
                Log.w(TAG, "canUseFullScreenIntent = false — tam ekran alarm heads-up'a dusecek. " +
                    "Kullanici Ayarlar > Bildirimler > Tam ekran bildirimler izni vermeli.")
            }
        }

        // BAL logu "balRequireOptInByPendingIntentCreator: true" diyor: opt-in
        // OLUSTURAN tarafta yapilmali, gonderen tarafta degil.
        val creatorOptions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ActivityOptions.makeBasic().apply {
                setPendingIntentCreatorBackgroundActivityStartMode(
                    ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                )
            }.toBundle()
        } else {
            bOptions
        }

        val fullScreenPendingIntent = if (creatorOptions != null) {
            PendingIntent.getActivity(context, requestCode, launchIntent, flags, creatorOptions)
        } else {
            PendingIntent.getActivity(context, requestCode, launchIntent, flags)
        }

        val notificationId = requestCode

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("💊 İlaç Vakti!")
            .setContentText("İlacınızı almanın zamanı geldi.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            // Onceden kalici + iptal edilemez sekilde atiliyordu: "Simdi Al"dan sonra
            // bildirim cubugunda asili kaliyor ve dokunuldugunda alarmi yeniden aciyordu.
            .setOngoing(false)
            .setAutoCancel(true)
            .setSilent(true)
            .setTimeoutAfter(FSI_TIMEOUT_MS)
            .setContentIntent(fullScreenPendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true)

        NotificationManagerCompat.from(context).notify(notificationId, builder.build())
        Log.d(TAG, "FullScreen notification posted with id: $notificationId")
    }
}
