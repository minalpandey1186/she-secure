package org.shesecure.app.ui

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import org.shesecure.app.control.SosActionHandler
import org.shesecure.app.control.SosAlertStatus
import org.shesecure.app.control.SosTriggerSource
import org.shesecure.app.databinding.ActivitySosCountdownBinding

class SosCountdownActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySosCountdownBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySosCountdownBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Wake screen on lockscreen for critical alert
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )

        setupListeners()
        observeSosState()
    }

    private fun setupListeners() {
        // Cancel SOS (Slide 12: Clean abort - No SMS sent, no alarm sounds)
        binding.btnCancelSos.setOnClickListener {
            SosActionHandler.cancelSos(this)
            finish()
        }

        // Mute Siren
        binding.btnStopSiren.setOnClickListener {
            SosActionHandler.stopActiveEmergency()
            binding.btnStopSiren.text = "Siren Muted"
            binding.btnStopSiren.isEnabled = false
        }

        // Call 112
        binding.btnCallPolice.setOnClickListener {
            val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:112"))
            startActivity(dialIntent)
        }

        // Dismiss
        binding.btnDismissSos.setOnClickListener {
            SosActionHandler.stopActiveEmergency()
            finish()
        }
    }

    private fun observeSosState() {
        lifecycleScope.launch {
            SosActionHandler.sosState.collectLatest { state ->
                // Update Trigger Source Label
                binding.tvTriggerSource.text = when (state.triggerSource) {
                    SosTriggerSource.MANUAL_BUTTON -> "Trigger Source: Manual SOS Button Tap"
                    SosTriggerSource.MOTION_ACCELEROMETER -> "Trigger Source: Motion Sensor (3 Jerks / 1.5s Detected)"
                    SosTriggerSource.AUDIO_SCREAM -> "Trigger Source: Audio Sensor (Scream / Sustained Loud Noise Detected)"
                    null -> "Trigger Source: Emergency Trigger"
                }

                when (state.status) {
                    SosAlertStatus.COUNTDOWN_ACTIVE -> {
                        binding.layoutCountdown.visibility = View.VISIBLE
                        binding.layoutActiveAlert.visibility = View.GONE
                        binding.tvCountdownSeconds.text = state.remainingSeconds.toString()
                        binding.progressBarCountdown.progress = state.remainingSeconds
                    }

                    SosAlertStatus.DISPATCHING, SosAlertStatus.ALERT_ACTIVE -> {
                        binding.layoutCountdown.visibility = View.GONE
                        binding.layoutActiveAlert.visibility = View.VISIBLE
                        binding.tvSosTitle.text = "EMERGENCY PROTOCOL ENGAGED"

                        // Render Fail-Visibly Audit Logs
                        val formattedLogs = state.failVisiblyLogs.joinToString("\n")
                        binding.tvFailVisiblyLogs.text = formattedLogs
                    }

                    SosAlertStatus.CANCELLED -> {
                        finish()
                    }

                    SosAlertStatus.IDLE -> {
                        // If returned to idle, close countdown
                    }
                }
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Prevent accidental hardware back button bypass during active countdown
        // User must explicitly tap "I AM SAFE (CANCEL)"
        if (SosActionHandler.sosState.value.status == SosAlertStatus.COUNTDOWN_ACTIVE) {
            SosActionHandler.cancelSos(this)
        }
        super.onBackPressed()
    }
}
