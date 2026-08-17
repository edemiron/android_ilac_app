package com.ilachatirlatici

import android.app.ActivityManager
import android.app.ForegroundServiceStartNotAllowedException
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters

/**
 * WorkManager Worker: Periyodik alarm kontrolü için.
 * Her 15 dakikada bir çalışır ve BootReceiver aracılığıyla
 * JS tarafındaki ReRegisterAlarmsTask'ı tetikler.
 */
class AlarmCheckWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    companion object {
        private const val TAG = "AlarmCheckWorker"
        const val WORK_NAME = "alarm_check_periodic"
    }

    override fun doWork(): Result {
        Log.d(TAG, "AlarmCheckWorker: periyodik kontrol başladı")

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !isAppForeground()) {
                Log.w(TAG, "AlarmCheckWorker: uygulama arka planda, bu tur foreground servis tetiklenemedi")
                return Result.success()
            }

            // BootTaskService'i başlat — bu zaten HeadlessJS'i çağırıyor
            val serviceIntent = Intent(applicationContext, BootTaskService::class.java).apply {
                putExtra("trigger", "workmanager_periodic")
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                applicationContext.startForegroundService(serviceIntent)
            } else {
                applicationContext.startService(serviceIntent)
            }

            Log.d(TAG, "AlarmCheckWorker: BootTaskService tetiklendi")
            Result.success()
        } catch (e: ForegroundServiceStartNotAllowedException) {
            Log.w(TAG, "AlarmCheckWorker: Android foreground servis başlangıcını engelledi, bu tur atlandı", e)
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "AlarmCheckWorker: servis başlatılamadı", e)
            // Kısa süre sonra tekrar dene
            Result.retry()
        }
    }

    private fun isAppForeground(): Boolean {
        val activityManager =
            applicationContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return false
        val packageName = applicationContext.packageName

        return activityManager.runningAppProcesses?.any { processInfo ->
            processInfo.processName == packageName &&
                processInfo.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE
        } == true
    }
}
