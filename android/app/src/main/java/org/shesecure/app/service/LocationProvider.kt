package org.shesecure.app.service

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import com.google.android.gms.location.*
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import org.shesecure.app.data.pref.SettingsManager
import java.util.Locale
import kotlin.coroutines.resume

data class SosLocationResult(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float,
    val isFresh: Boolean,
    val googleMapsUrl: String,
    val statusMessage: String
)

class LocationProvider(private val context: Context) {

    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)
    private val locationManager =
        context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    private val settingsManager = SettingsManager(context)

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(timeoutMs: Long = 4000): SosLocationResult {
        val freshLocation = withTimeoutOrNull(timeoutMs) {
            fetchFusedHighAccuracy() ?: fetchFrameworkGps()
        }

        return if (freshLocation != null) {
            settingsManager.lastKnownLatitude = freshLocation.latitude
            settingsManager.lastKnownLongitude = freshLocation.longitude
            val url = formatGoogleMapsUrl(freshLocation.latitude, freshLocation.longitude)
            SosLocationResult(
                latitude = freshLocation.latitude,
                longitude = freshLocation.longitude,
                accuracyMeters = freshLocation.accuracy,
                isFresh = true,
                googleMapsUrl = url,
                statusMessage = "GPS Fix Acquired (Accuracy ±${freshLocation.accuracy.toInt()}m)"
            )
        } else {
            // Fail-visibly fallback to last known location
            val cachedLat = settingsManager.lastKnownLatitude
            val cachedLng = settingsManager.lastKnownLongitude
            val url = formatGoogleMapsUrl(cachedLat, cachedLng)
            SosLocationResult(
                latitude = cachedLat,
                longitude = cachedLng,
                accuracyMeters = 50.0f,
                isFresh = false,
                googleMapsUrl = url,
                statusMessage = "GPS Timeout: Using Last Known Location (${String.format(Locale.US, "%.4f, %.4f", cachedLat, cachedLng)})"
            )
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun fetchFusedHighAccuracy(): Location? = suspendCancellableCoroutine { continuation ->
        try {
            val locationRequest = CurrentLocationRequest.Builder()
                .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
                .setDurationMillis(3500)
                .setMaxUpdateAgeMillis(5000)
                .build()

            fusedLocationClient.getCurrentLocation(locationRequest, null)
                .addOnSuccessListener { loc ->
                    if (continuation.isActive) continuation.resume(loc)
                }
                .addOnFailureListener {
                    if (continuation.isActive) continuation.resume(null)
                }
        } catch (e: Exception) {
            if (continuation.isActive) continuation.resume(null)
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun fetchFrameworkGps(): Location? = suspendCancellableCoroutine { continuation ->
        try {
            val listener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    locationManager.removeUpdates(this)
                    if (continuation.isActive) continuation.resume(location)
                }
                @Deprecated("Deprecated in Java")
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }

            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestSingleUpdate(LocationManager.GPS_PROVIDER, listener, Looper.getMainLooper())
            } else if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestSingleUpdate(LocationManager.NETWORK_PROVIDER, listener, Looper.getMainLooper())
            } else {
                if (continuation.isActive) continuation.resume(null)
            }
        } catch (e: Exception) {
            if (continuation.isActive) continuation.resume(null)
        }
    }

    private fun formatGoogleMapsUrl(lat: Double, lng: Double): String {
        return "https://maps.google.com/?q=${String.format(Locale.US, "%.6f,%.6f", lat, lng)}"
    }
}
