package org.shesecure.app.data.model

import com.google.gson.annotations.SerializedName

data class NominatimPlace(
    @SerializedName("place_id")
    val placeId: Long,

    @SerializedName("osm_id")
    val osmId: Long,

    @SerializedName("lat")
    val lat: String,

    @SerializedName("lon")
    val lon: String,

    @SerializedName("display_name")
    val displayName: String,

    @SerializedName("name")
    val name: String?,

    @SerializedName("type")
    val type: String?,

    @SerializedName("address")
    val address: NominatimAddress?
)

data class NominatimAddress(
    @SerializedName("police")
    val police: String?,

    @SerializedName("road")
    val road: String?,

    @SerializedName("suburb")
    val suburb: String?,

    @SerializedName("city")
    val city: String?,

    @SerializedName("state")
    val state: String?
)

data class PoliceStation(
    val id: String,
    val name: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val distanceMeters: Float,
    val estimatedWalkingMinutes: Int,
    val phone: String = "112"
)
