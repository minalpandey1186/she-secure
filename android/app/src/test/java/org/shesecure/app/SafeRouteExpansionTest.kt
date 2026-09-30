package org.shesecure.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.shesecure.app.data.model.PoliceStation

class SafeRouteExpansionTest {

    private fun searchPoliceStationsWithExpansion(
        stationsDb: List<PoliceStation>,
        userLat: Double,
        userLng: Double
    ): Pair<List<PoliceStation>, Int> {
        // Step 1: Search 5km
        val within5km = stationsDb.filter { it.distanceMeters <= 5000f }
        if (within5km.isNotEmpty()) {
            return Pair(within5km, 5)
        }

        // Step 2: Auto-widen to 15km
        val within15km = stationsDb.filter { it.distanceMeters <= 15000f }
        return Pair(within15km, 15)
    }

    @Test
    fun testNearbyStationReturns5kmRadius() {
        val stations = listOf(
            PoliceStation("1", "Local Outpost", "Near Gate", 13.13, 77.56, 1200f, 15),
            PoliceStation("2", "Far Station", "Highway", 13.20, 77.60, 11000f, 130)
        )

        val (results, radius) = searchPoliceStationsWithExpansion(stations, 13.13, 77.56)
        assertEquals(5, radius)
        assertEquals(1, results.size)
        assertEquals("Local Outpost", results[0].name)
    }

    @Test
    fun testNoStationsIn5kmExpandsTo15km() {
        val stations = listOf(
            PoliceStation("2", "Regional Headquarters", "Outer Ring Road", 13.20, 77.60, 8500f, 105),
            PoliceStation("3", "District Division", "State Highway", 13.25, 77.65, 14000f, 175)
        )

        val (results, radius) = searchPoliceStationsWithExpansion(stations, 13.13, 77.56)
        assertEquals(15, radius)
        assertEquals(2, results.size)
    }
}
