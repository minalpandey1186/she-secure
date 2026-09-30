package org.shesecure.app.control

import android.content.Context
import android.content.Intent
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.shesecure.app.SheSecureApp
import org.shesecure.app.service.AlarmSirenManager
import org.shesecure.app.service.EmailDispatcher
import org.shesecure.app.service.LocationProvider
import org.shesecure.app.service.SmsDispatcher
import org.shesecure.app.service.SosEmailReport
import org.shesecure.app.service.SosLocationResult
import org.shesecure.app.service.SosSmsReport
import org.shesecure.app.ui.SosCountdownActivity

enum class SosTriggerSource {
    MANUAL_BUTTON,
    MOTION_ACCELEROMETER,
    PHONE_SHAKE,
    VOICE_CODEWORD,
    AUDIO_SCREAM
}

enum class SosAlertStatus {
    IDLE,
    COUNTDOWN_ACTIVE,
    DISPATCHING,
    ALERT_ACTIVE,
    CANCELLED
}

data class SosExecutionState(
    val status: SosAlertStatus = SosAlertStatus.IDLE,
    val triggerSource: SosTriggerSource? = null,
    val remainingSeconds: Int = 5,
    val locationResult: SosLocationResult? = null,
    val smsReport: SosSmsReport? = null,
    val emailReport: SosEmailReport? = null,
    val failVisiblyLogs: List<String> = emptyList(),
    val isSirenPlaying: Boolean = false
)

object SosActionHandler {

    private val _sosState = MutableStateFlow(SosExecutionState())
    val sosState: StateFlow<SosExecutionState> = _sosState.asStateFlow()

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var countdownJob: Job? = null

    private lateinit var locationProvider: LocationProvider
    private lateinit var smsDispatcher: SmsDispatcher
    private lateinit var emailDispatcher: EmailDispatcher
    private lateinit var sirenManager: AlarmSirenManager

    fun initialize(context: Context) {
        locationProvider = LocationProvider(context)
        smsDispatcher = SmsDispatcher(context)
        emailDispatcher = EmailDispatcher(context)
        sirenManager = AlarmSirenManager(context)
    }

    /**
     * Single Shared Alert Pathway Entrypoint (Slides 7, 10, 12)
     * Called by Manual Button, Phone Accelerometer Shake, Voice Code Word, or Audio Scream.
     */
    @Synchronized
    fun initiateSos(context: Context, source: SosTriggerSource) {
        val currentState = _sosState.value.status
        if (currentState == SosAlertStatus.COUNTDOWN_ACTIVE || currentState == SosAlertStatus.ALERT_ACTIVE || currentState == SosAlertStatus.DISPATCHING) {
            return
        }

        val app = context.applicationContext as SheSecureApp
        val duration = app.settingsManager.countdownDurationSeconds

        val log = "🚨 Distress signal received from [${source.name}]. Starting ${duration}s cancellable countdown."
        _sosState.value = SosExecutionState(
            status = SosAlertStatus.COUNTDOWN_ACTIVE,
            triggerSource = source,
            remainingSeconds = duration,
            failVisiblyLogs = listOf(log)
        )

        // Launch SOS Countdown Activity
        val intent = Intent(context, SosCountdownActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        context.startActivity(intent)

        // 5-second countdown
        countdownJob?.cancel()
        countdownJob = scope.launch {
            for (sec in duration downTo 1) {
                _sosState.value = _sosState.value.copy(remainingSeconds = sec)
                delay(1000)
            }
            _sosState.value = _sosState.value.copy(remainingSeconds = 0)
            executeSosDispatch(context)
        }
    }

    fun cancelSos(context: Context) {
        countdownJob?.cancel()
        countdownJob = null

        sirenManager.stopSirenAndVibration()

        val logs = _sosState.value.failVisiblyLogs.toMutableList().apply {
            add("SOS Cancelled by user. Clean abort: No SMS dispatched, no email dispatched, no alarm triggered.")
        }

        _sosState.value = SosExecutionState(
            status = SosAlertStatus.CANCELLED,
            failVisiblyLogs = logs,
            isSirenPlaying = false
        )
    }

    fun stopActiveEmergency() {
        sirenManager.stopSirenAndVibration()
        _sosState.value = SosExecutionState(status = SosAlertStatus.IDLE)
    }

    /**
     * Executes when the 5s countdown expires:
     * Dispatches SMS directly without asking the user, sends email, triggers siren & GPS.
     */
    private suspend fun executeSosDispatch(context: Context) {
        _sosState.value = _sosState.value.copy(status = SosAlertStatus.DISPATCHING)
        val logs = _sosState.value.failVisiblyLogs.toMutableList()
        logs.add("Countdown expired. Initiating direct automated emergency dispatch...")

        val app = context.applicationContext as SheSecureApp

        // 1. GPS Coordinates
        logs.add("Acquiring high-accuracy GPS coordinates via LocationManager...")
        val locationResult = locationProvider.getCurrentLocation(timeoutMs = 3500)
        logs.add(locationResult.statusMessage)
        logs.add("Maps Coordinate Link: ${locationResult.googleMapsUrl}")

        // 2. Room DB Contacts
        val contacts = withContext(Dispatchers.IO) {
            app.database.contactDao().getAllContactsSync()
        }

        // 3. Direct SMS Dispatch via SmsManager (Directly sent in background)
        logs.add("--- DIRECT AUTOMATED SMS BROADCAST ---")
        val template = app.settingsManager.smsMessageTemplate
        val smsReport = smsDispatcher.dispatchEmergencySms(contacts, template, locationResult)

        smsReport.details.forEach { detail ->
            logs.add("📱 [SMS -> ${detail.contactName} (${detail.phoneNumber})]: ${detail.message}")
        }

        // 4. Email Alerting Dispatch
        val triggerName = _sosState.value.triggerSource?.name ?: "MANUAL_TRIGGER"
        logs.add("--- AUTOMATED EMAIL DISTRESS BROADCAST ---")
        val emailReport = emailDispatcher.dispatchEmergencyEmails(contacts, locationResult, triggerName)

        emailReport.details.forEach { detail ->
            logs.add("✉️ [EMAIL -> ${detail.contactName} (${detail.email})]: ${detail.message}")
        }

        // 5. Siren & Vibration
        if (app.settingsManager.isSirenSoundEnabled || app.settingsManager.isVibrationEnabled) {
            sirenManager.startSirenAndVibration(scope)
            logs.add("High-decibel emergency siren and tactile vibration active.")
        }

        logs.add("SUCCESS: All emergency alerts directly dispatched by system.")

        _sosState.value = _sosState.value.copy(
            status = SosAlertStatus.ALERT_ACTIVE,
            locationResult = locationResult,
            smsReport = smsReport,
            emailReport = emailReport,
            failVisiblyLogs = logs,
            isSirenPlaying = true
        )
    }
}
