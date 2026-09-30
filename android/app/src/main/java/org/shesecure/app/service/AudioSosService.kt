package org.shesecure.app.service

import android.annotation.SuppressLint
import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import org.shesecure.app.SheSecureApp
import org.shesecure.app.control.SosActionHandler
import org.shesecure.app.control.SosTriggerSource
import org.shesecure.app.ui.MainActivity
import kotlin.math.log10
import kotlin.math.sqrt

class AudioSosService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var isRecording = false
    private var audioRecord: AudioRecord? = null

    // Debouncing: sustained loud sound for ~1.0 second (Slide 12)
    private val SUSTAINED_DURATION_MS = 1000L
    private var loudSoundStartTime = 0L

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createServiceNotification()
        startForeground(NOTIFICATION_ID, notification)

        startAudioMonitoring()

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAudioMonitoring()
        serviceScope.cancel()
    }

    @SuppressLint("MissingPermission")
    private fun startAudioMonitoring() {
        if (isRecording) return
        isRecording = true

        serviceScope.launch {
            val sampleRate = 16000
            val channelConfig = AudioFormat.CHANNEL_IN_MONO
            val audioFormat = AudioFormat.ENCODING_PCM_16BIT
            val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
            val bufferSize = (minBufferSize * 2).coerceAtLeast(2048)

            try {
                audioRecord = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    channelConfig,
                    audioFormat,
                    bufferSize
                )

                if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                    return@launch
                }

                audioRecord?.startRecording()

                val buffer = ShortArray(bufferSize / 2)
                val app = application as SheSecureApp

                while (isRecording && isActive) {
                    val readCount = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (readCount > 0 && app.settingsManager.isAudioDetectionEnabled) {
                        // Calculate RMS (Root Mean Square) Amplitude
                        var sum = 0.0
                        for (i in 0 until readCount) {
                            sum += buffer[i] * buffer[i]
                        }
                        val rms = sqrt(sum / readCount)

                        // Convert RMS to approximate decibels (dB SPL reference)
                        val db = if (rms > 1.0) {
                            20.0 * log10(rms / 0.1) // Calibrated relative dB
                        } else {
                            0.0
                        }

                        val thresholdDb = app.settingsManager.audioDbThreshold.toDouble()
                        val currentTime = System.currentTimeMillis()

                        if (db >= thresholdDb) {
                            if (loudSoundStartTime == 0L) {
                                loudSoundStartTime = currentTime
                            } else {
                                val sustainedMs = currentTime - loudSoundStartTime
                                if (sustainedMs >= SUSTAINED_DURATION_MS) {
                                    // Sustained loud sound detected (~1.0s) -> Initiate SOS
                                    loudSoundStartTime = 0L
                                    withContext(Dispatchers.Main) {
                                        SosActionHandler.initiateSos(
                                            applicationContext,
                                            SosTriggerSource.AUDIO_SCREAM
                                        )
                                    }
                                }
                            }
                        } else {
                            // Sound dipped below threshold -> reset debounce timer
                            loudSoundStartTime = 0L
                        }
                    }
                    delay(50) // 50ms sampling window
                }
            } catch (e: Exception) {
                // Audio recording exception handling
            } finally {
                try {
                    audioRecord?.stop()
                    audioRecord?.release()
                    audioRecord = null
                } catch (ignored: Exception) {}
            }
        }
    }

    private fun stopAudioMonitoring() {
        isRecording = false
        try {
            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
        } catch (ignored: Exception) {}
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createServiceNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, SheSecureApp.CHANNEL_AUDIO_SERVICE)
            .setContentTitle("SheSecure Audio Sentinel Active")
            .setContentText("Monitoring ambient sound for emergency scream detection (~1s sustained)")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    companion object {
        private const val NOTIFICATION_ID = 2002

        fun startService(context: Context) {
            val intent = Intent(context, AudioSosService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, AudioSosService::class.java)
            context.stopService(intent)
        }
    }
}
