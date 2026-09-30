package org.shesecure.app.service

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.CombinedVibration
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import kotlinx.coroutines.*
import kotlin.math.sin

class AlarmSirenManager(private val context: Context) {

    private var audioTrack: AudioTrack? = null
    private var isPlayingSiren = false
    private var sirenJob: Job? = null
    private var vibrator: Vibrator? = null

    init {
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            manager?.defaultVibrator ?: context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    fun startSirenAndVibration(coroutineScope: CoroutineScope) {
        if (isPlayingSiren) return
        isPlayingSiren = true

        // 1. Start Audio Siren Synthesis in background thread
        sirenJob = coroutineScope.launch(Dispatchers.Default) {
            generateSirenTone()
        }

        // 2. Start Emergency Vibration Pattern
        startEmergencyVibration()
    }

    private fun generateSirenTone() {
        val sampleRate = 44100
        val minBufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val bufferSize = (sampleRate * 0.1).toInt() * 2 // 100ms chunk

        try {
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            audioTrack?.play()

            val buffer = ShortArray(bufferSize / 2)
            var currentFreq = 800.0
            var freqDirection = 1
            var phase = 0.0

            while (isPlayingSiren) {
                // Modulate frequency between 700 Hz and 1600 Hz (Classic European/Indian Emergency Siren)
                for (i in buffer.indices) {
                    val angle = 2.0 * Math.PI * currentFreq / sampleRate
                    phase += angle
                    if (phase > 2.0 * Math.PI) phase -= 2.0 * Math.PI

                    buffer[i] = (sin(phase) * Short.MAX_VALUE * 0.85).toInt().toShort()

                    // Sweep frequency
                    currentFreq += freqDirection * 1.5
                    if (currentFreq >= 1600.0) {
                        freqDirection = -1
                    } else if (currentFreq <= 700.0) {
                        freqDirection = 1
                    }
                }
                audioTrack?.write(buffer, 0, buffer.size)
            }
        } catch (e: Exception) {
            // AudioTrack fallback
        } finally {
            try {
                audioTrack?.stop()
                audioTrack?.release()
                audioTrack = null
            } catch (ignored: Exception) {}
        }
    }

    private fun startEmergencyVibration() {
        try {
            vibrator?.let { vib ->
                if (!vib.hasVibrator()) return
                val timings = longArrayOf(0, 500, 150, 500, 150, 900, 300)
                val amplitudes = intArrayOf(0, 255, 0, 255, 0, 255, 0)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val effect = VibrationEffect.createWaveform(timings, amplitudes, 0) // Repeat from index 0
                    vib.vibrate(effect)
                } else {
                    @Suppress("DEPRECATION")
                    vib.vibrate(timings, 0)
                }
            }
        } catch (ignored: Exception) {}
    }

    fun stopSirenAndVibration() {
        isPlayingSiren = false
        sirenJob?.cancel()
        sirenJob = null

        try {
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
        } catch (ignored: Exception) {}

        try {
            vibrator?.cancel()
        } catch (ignored: Exception) {}
    }
}
