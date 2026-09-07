package com.ilachatirlatici

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.SoundPool
import android.util.Log
import android.view.SoundEffectConstants
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * WheelSoundModule — Tarih çarkı (WheelColumn) mekanik tıkırtı ("çıt çıt çıt") ses motoru.
 *
 * 60 FPS akıcı kaydırma için:
 * 1. SoundPool ile RAM'de çözülmüş 16-bit PCM (0ms latency).
 * 2. 6 eşzamanlı ses kanalı (rapid momentum flings sırasında ses kesilmesi/boğulması olmaz).
 * 3. Asset yüklenene kadar veya arıza durumunda AudioManager.playSoundEffect fallback'i.
 */
class WheelSoundModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "WheelSoundModule"
        private const val MAX_STREAMS = 6
        private const val TICK_VOLUME = 0.65f
    }

    private var soundPool: SoundPool? = null
    private var tickSoundId: Int = 0
    @Volatile
    private var isLoaded: Boolean = false

    private val audioManager: AudioManager? by lazy {
        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    }

    init {
        initSoundPool()
    }

    private fun initSoundPool() {
        try {
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            soundPool = SoundPool.Builder()
                .setMaxStreams(MAX_STREAMS)
                .setAudioAttributes(audioAttributes)
                .build().apply {
                    setOnLoadCompleteListener { _, sampleId, status ->
                        if (status == 0) {
                            isLoaded = true
                            Log.d(TAG, "Wheel tick sound loaded successfully (id: $sampleId)")
                        } else {
                            Log.w(TAG, "Failed to load wheel tick sound, status: $status")
                        }
                    }
                }

            val resId = reactApplicationContext.resources.getIdentifier(
                "wheel_tick",
                "raw",
                reactApplicationContext.packageName
            )

            if (resId != 0) {
                tickSoundId = soundPool?.load(reactApplicationContext, resId, 1) ?: 0
                Log.d(TAG, "SoundPool loading wheel_tick from raw resource id: $resId")
            } else {
                Log.w(TAG, "wheel_tick resource not found in res/raw, using system click fallback")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing SoundPool for wheel tick", e)
        }
    }

    override fun getName(): String = "WheelSoundModule"

    /**
     * Çark her diş atladığında React Native tarafından çağrılır.
     * Sıfır bellek tahsisi ve anında donanım ses tetiklemesi sağlar.
     */
    @ReactMethod
    fun playTick() {
        try {
            if (isLoaded && tickSoundId != 0) {
                // SoundPool: play(soundID, leftVolume, rightVolume, priority, loop, rate)
                soundPool?.play(tickSoundId, TICK_VOLUME, TICK_VOLUME, 1, 0, 1.0f)
            } else {
                audioManager?.playSoundEffect(SoundEffectConstants.CLICK, TICK_VOLUME)
            }
        } catch (_: Exception) {
            try {
                audioManager?.playSoundEffect(SoundEffectConstants.CLICK)
            } catch (_: Exception) {
                // Non-critical audio feedback failure
            }
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            soundPool?.release()
            soundPool = null
            isLoaded = false
            Log.d(TAG, "SoundPool released gracefully")
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing SoundPool", e)
        }
    }
}
