package org.shesecure.app.ui

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import kotlinx.coroutines.launch
import org.shesecure.app.SheSecureApp
import org.shesecure.app.data.model.PoliceStation
import org.shesecure.app.data.repository.SafeRouteRepository
import org.shesecure.app.data.repository.SafeRouteResult
import org.shesecure.app.databinding.ActivitySafeRouteBinding
import org.shesecure.app.service.LocationProvider
import java.util.Locale

class SafeRouteActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySafeRouteBinding
    private lateinit var app: SheSecureApp
    private lateinit var locationProvider: LocationProvider
    private val safeRouteRepository = SafeRouteRepository()
    private lateinit var adapter: SafeRouteAdapter
    private var selectedStation: PoliceStation? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySafeRouteBinding.inflate(layoutInflater)
        setContentView(binding.root)

        app = application as SheSecureApp
        locationProvider = LocationProvider(this)

        setupRecyclerView()
        setupListeners()
        loadNearbyPoliceStations()
    }

    private fun setupRecyclerView() {
        adapter = SafeRouteAdapter(
            onSelectStation = { station ->
                showWalkingGuidance(station)
            },
            onCallStation = { station ->
                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${station.phone}"))
                startActivity(intent)
            }
        )

        binding.rvPoliceStations.layoutManager = LinearLayoutManager(this)
        binding.rvPoliceStations.adapter = adapter
    }

    private fun setupListeners() {
        binding.btnBack.setOnClickListener {
            finish()
        }

        binding.btnRefresh.setOnClickListener {
            loadNearbyPoliceStations()
        }

        binding.btnOpenGoogleMaps.setOnClickListener {
            selectedStation?.let { station ->
                // Open Google Maps walking directions intent
                val uri = Uri.parse("google.navigation:q=${station.latitude},${station.longitude}&mode=w")
                val mapIntent = Intent(Intent.ACTION_VIEW, uri).apply {
                    setPackage("com.google.android.apps.maps")
                }
                if (mapIntent.resolveActivity(packageManager) != null) {
                    startActivity(mapIntent)
                } else {
                    // Fallback to browser Google Maps
                    val webUri = Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}&travelmode=walking")
                    startActivity(Intent(Intent.ACTION_VIEW, webUri))
                }
            }
        }
    }

    private fun loadNearbyPoliceStations() {
        binding.progressBarRoute.visibility = View.VISIBLE
        binding.tvRadiusStatus.text = "Acquiring live GPS coordinates & querying police stations..."

        lifecycleScope.launch {
            val locationResult = locationProvider.getCurrentLocation(timeoutMs = 3000)

            when (val result = safeRouteRepository.findNearbyPoliceStations(locationResult.latitude, locationResult.longitude)) {
                is SafeRouteResult.Success -> {
                    binding.progressBarRoute.visibility = View.GONE
                    adapter.submitList(result.stations)

                    if (result.wasExpanded) {
                        binding.tvRadiusStatus.text = "⚠️ No stations within 5 km. Automatically expanded safety radius to 15 km (${result.stations.size} station(s) found)."
                        binding.tvRadiusStatus.setTextColor(getColor(org.shesecure.app.R.color.warning_yellow))
                    } else {
                        binding.tvRadiusStatus.text = "✓ Found ${result.stations.size} police station(s) within standard 5 km safety zone."
                        binding.tvRadiusStatus.setTextColor(getColor(org.shesecure.app.R.color.accent))
                    }

                    // Pre-select nearest station
                    result.stations.firstOrNull()?.let { showWalkingGuidance(it) }
                }

                is SafeRouteResult.Error -> {
                    binding.progressBarRoute.visibility = View.GONE
                    binding.tvRadiusStatus.text = "FAIL-VISIBLY: ${result.message}"
                    Toast.makeText(this@SafeRouteActivity, result.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun showWalkingGuidance(station: PoliceStation) {
        selectedStation = station
        binding.cardActiveRoute.visibility = View.VISIBLE

        val distText = if (station.distanceMeters >= 1000) {
            String.format(Locale.US, "%.1f km", station.distanceMeters / 1000.0)
        } else {
            "${station.distanceMeters.toInt()} m"
        }

        binding.tvSelectedStationTitle.text = "${station.name} ($distText)"
        binding.tvWalkingInstructions.text =
            "Estimated Walking Duration: ~${station.estimatedWalkingMinutes} minutes on foot. Direct destination: ${station.address}."
    }
}
