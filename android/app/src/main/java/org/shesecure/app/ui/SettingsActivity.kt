package org.shesecure.app.ui

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import org.shesecure.app.SheSecureApp
import org.shesecure.app.databinding.ActivitySettingsBinding
import org.shesecure.app.service.AudioSosService
import org.shesecure.app.service.MotionSosService
import java.util.Locale

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var app: SheSecureApp

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        app = application as SheSecureApp

        loadCurrentSettings()
        setupListeners()
    }

    private fun loadCurrentSettings() {
        val s = app.settingsManager

        binding.switchMotionService.isChecked = s.isMotionDetectionEnabled
        binding.sliderMotionThreshold.value = s.motionJerkThreshold.coerceIn(8.0f, 25.0f)
        binding.tvMotionThresholdLabel.text = String.format(Locale.US, "Acceleration Jerk Threshold: %.1f m/s²", s.motionJerkThreshold)

        binding.switchAudioService.isChecked = s.isAudioDetectionEnabled
        binding.sliderAudioThreshold.value = s.audioDbThreshold.coerceIn(60.0f, 95.0f)
        binding.tvAudioThresholdLabel.text = String.format(Locale.US, "Sound Loudness Threshold: %.0f dB", s.audioDbThreshold)

        binding.switchSirenSound.isChecked = s.isSirenSoundEnabled
        binding.switchVibration.isChecked = s.isVibrationEnabled

        binding.etSmsTemplate.setText(s.smsMessageTemplate)
    }

    private fun setupListeners() {
        binding.btnBack.setOnClickListener {
            finish()
        }

        binding.sliderMotionThreshold.addOnChangeListener { _, value, _ ->
            binding.tvMotionThresholdLabel.text = String.format(Locale.US, "Acceleration Jerk Threshold: %.1f m/s²", value)
        }

        binding.sliderAudioThreshold.addOnChangeListener { _, value, _ ->
            binding.tvAudioThresholdLabel.text = String.format(Locale.US, "Sound Loudness Threshold: %.0f dB", value)
        }

        binding.btnSaveSettings()
    }

    private fun ActivitySettingsBinding.btnSaveSettings() {
        btnSaveSettings.setOnClickListener {
            val s = app.settingsManager

            s.isMotionDetectionEnabled = switchMotionService.isChecked
            s.motionJerkThreshold = sliderMotionThreshold.value

            s.isAudioDetectionEnabled = switchAudioService.isChecked
            s.audioDbThreshold = sliderAudioThreshold.value

            s.isSirenSoundEnabled = switchSirenSound.isChecked
            s.isVibrationEnabled = switchVibration.isChecked

            val template = etSmsTemplate.text.toString().trim()
            if (template.isNotEmpty()) {
                s.smsMessageTemplate = template
            }

            // Sync running services
            if (s.isMotionDetectionEnabled) {
                MotionSosService.startService(this@SettingsActivity)
            } else {
                MotionSosService.stopService(this@SettingsActivity)
            }

            if (s.isAudioDetectionEnabled) {
                AudioSosService.startService(this@SettingsActivity)
            } else {
                AudioSosService.stopService(this@SettingsActivity)
            }

            Toast.makeText(this@SettingsActivity, "Settings & Sensitivity thresholds saved", Toast.LENGTH_SHORT).show()
            finish()
        }
    }
}
