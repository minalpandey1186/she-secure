package org.shesecure.app.service

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.IBinder
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.NotificationCompat
import org.shesecure.app.SheSecureApp
import org.shesecure.app.control.SosActionHandler
import org.shesecure.app.control.SosTriggerSource
import org.shesecure.app.ui.MainActivity
import java.util.Locale

class VoiceSentinelService : Service(), RecognitionListener {

    private var speechRecognizer: SpeechRecognizer? = null
    private var recognizerIntent: Intent? = null
    private var isListening = false

    override fun onCreate() {
        super.onCreate()
        initSpeechRecognizer()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createServiceNotification()
        startForeground(NOTIFICATION_ID, notification)

        startContinuousListening()

        return START_STICKY
    }

    private fun initSpeechRecognizer() {
        if (SpeechRecognizer.isRecognitionAvailable(this)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
            speechRecognizer?.setRecognitionListener(this)

            recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            }
        }
    }

    private fun startContinuousListening() {
        val app = application as SheSecureApp
        if (!app.settingsManager.isVoiceCodeWordEnabled) return

        try {
            speechRecognizer?.startListening(recognizerIntent)
            isListening = true
        } catch (e: Exception) {
            isListening = false
        }
    }

    override fun onResults(results: Bundle?) {
        checkSpeechMatches(results)
        restartListening()
    }

    override fun onPartialResults(partialResults: Bundle?) {
        checkSpeechMatches(partialResults)
    }

    private fun checkSpeechMatches(bundle: Bundle?) {
        val matches = bundle?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: return
        val app = application as SheSecureApp
        val secretWord = app.settingsManager.secretCodeWord.uppercase().trim()

        if (secretWord.isEmpty()) return

        for (phrase in matches) {
            val upperPhrase = phrase.uppercase().trim()
            if (upperPhrase.contains(secretWord) || upperPhrase == secretWord) {
                // Secret Code Word Detected!
                SosActionHandler.initiateSos(applicationContext, SosTriggerSource.VOICE_CODEWORD)
                break
            }
        }
    }

    override fun onError(error: Int) {
        restartListening()
    }

    private fun restartListening() {
        val app = application as? SheSecureApp
        if (app?.settingsManager?.isVoiceCodeWordEnabled == true) {
            try {
                speechRecognizer?.cancel()
                speechRecognizer?.startListening(recognizerIntent)
            } catch (e: Exception) {}
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        speechRecognizer?.destroy()
        speechRecognizer = null
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    private fun createServiceNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, SheSecureApp.CHANNEL_AUDIO_SERVICE)
            .setContentTitle("SheSecure Voice Code Word Sentinel")
            .setContentText("Listening for secret emergency distress code word")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    companion object {
        private const val NOTIFICATION_ID = 2003

        fun startService(context: Context) {
            val intent = Intent(context, VoiceSentinelService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, VoiceSentinelService::class.java)
            context.stopService(intent)
        }
    }
}
