package org.shesecure.app.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import org.shesecure.app.databinding.ActivityPermissionsBinding

class PermissionsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPermissionsBinding

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        refreshPermissionStatuses()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPermissionsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
        refreshPermissionStatuses()
    }

    private fun setupListeners() {
        binding.btnBack.setOnClickListener {
            finish()
        }

        binding.btnGrantAllPermissions.setOnClickListener {
            requestAllPermissions()
        }
    }

    private fun refreshPermissionStatuses() {
        // SMS Status
        val smsGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED
        binding.tvSmsPermStatus.text = if (smsGranted) "Granted ✓" else "Not Granted (Required for offline SMS)"
        binding.tvSmsPermStatus.setTextColor(getColor(if (smsGranted) org.shesecure.app.R.color.accent else org.shesecure.app.R.color.sos_red))

        // Location Status
        val locGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        binding.tvLocationPermStatus.text = if (locGranted) "Granted ✓" else "Not Granted (Required for GPS coordinates)"
        binding.tvLocationPermStatus.setTextColor(getColor(if (locGranted) org.shesecure.app.R.color.accent else org.shesecure.app.R.color.sos_red))

        // Audio Status
        val audioGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        binding.tvAudioPermStatus.text = if (audioGranted) "Granted ✓" else "Not Granted (Required for scream detection)"
        binding.tvAudioPermStatus.setTextColor(getColor(if (audioGranted) org.shesecure.app.R.color.accent else org.shesecure.app.R.color.sos_red))
    }

    private fun requestAllPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.RECORD_AUDIO
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(permissions.toTypedArray())
    }
}
