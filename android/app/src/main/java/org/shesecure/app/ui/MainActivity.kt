package org.shesecure.app.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import org.shesecure.app.SheSecureApp
import org.shesecure.app.control.SosActionHandler
import org.shesecure.app.control.SosAlertStatus
import org.shesecure.app.control.SosTriggerSource
import org.shesecure.app.databinding.ActivityMainBinding
import org.shesecure.app.service.AudioSosService
import org.shesecure.app.service.MotionSosService
import org.shesecure.app.service.VoiceSentinelService

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var app: SheSecureApp

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        updateServiceState()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = application as SheSecureApp

        if (app.settingsManager.isFirstLaunch) {
            startActivity(Intent(this, OnboardingActivity::class.java))
            finish()
            return
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        SosActionHandler.initialize(this)

        setupListeners()
        observeData()
        checkAndRequestPermissions()
    }

    override fun onResume() {
        super.onResume()
        updateServiceState()
    }

    private fun setupListeners() {
        // Giant SOS Button (Manual Trigger)
        binding.btnSosManual.setOnClickListener {
            SosActionHandler.initiateSos(this, SosTriggerSource.MANUAL_BUTTON)
        }

        // Navigation
        binding.cardSafeRoute.setOnClickListener {
            startActivity(Intent(this, SafeRouteActivity::class.java))
        }

        binding.cardContacts.setOnClickListener {
            startActivity(Intent(this, ContactsActivity::class.java))
        }

        binding.btnSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        binding.btnPermissions.setOnClickListener {
            startActivity(Intent(this, PermissionsActivity::class.java))
        }
    }

    private fun observeData() {
        // Observe Room DB emergency contacts
        lifecycleScope.launch {
            app.database.contactDao().getAllContactsFlow().collectLatest { contacts ->
                binding.tvContactsSummary.text = "Offline Room DB • ${contacts.size} Contact(s) Configured"
            }
        }

        // Observe SOS Alert Status
        lifecycleScope.launch {
            SosActionHandler.sosState.collectLatest { state ->
                if (state.status == SosAlertStatus.COUNTDOWN_ACTIVE || state.status == SosAlertStatus.ALERT_ACTIVE) {
                    binding.tvProtectionStatus.text = "EMERGENCY PROTOCOL ENGAGED"
                    binding.statusIndicator.setBackgroundResource(org.shesecure.app.R.drawable.circle_red)
                } else {
                    val codeWord = app.settingsManager.secretCodeWord
                    binding.tvProtectionStatus.text = "Armed • Shake & Voice (\"$codeWord\") Active"
                    binding.statusIndicator.setBackgroundResource(org.shesecure.app.R.drawable.circle_green)
                }
            }
        }
    }

    private fun updateServiceState() {
        val settings = app.settingsManager

        if (settings.isMotionDetectionEnabled && hasMotionPermissions()) {
            MotionSosService.startService(this)
            binding.tvMotionStatus.text = "Shake / Jerks (Armed)"
        } else {
            MotionSosService.stopService(this)
            binding.tvMotionStatus.text = "Disabled"
        }

        if (settings.isAudioDetectionEnabled && hasAudioPermissions()) {
            AudioSosService.startService(this)
            binding.tvAudioStatus.text = "Scream / ~1s (Armed)"
        } else {
            AudioSosService.stopService(this)
            binding.tvAudioStatus.text = "Disabled"
        }

        if (settings.isVoiceCodeWordEnabled && hasAudioPermissions()) {
            VoiceSentinelService.startService(this)
        } else {
            VoiceSentinelService.stopService(this)
        }
    }

    private fun hasMotionPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(this, Manifest.permission.HIGH_SAMPLING_RATE_SENSORS) == PackageManager.PERMISSION_GRANTED
        } else true
    }

    private fun hasAudioPermissions(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    }

    private fun checkAndRequestPermissions() {
        val permissionsToRequest = mutableListOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.RECORD_AUDIO
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val missing = permissionsToRequest.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }
}
