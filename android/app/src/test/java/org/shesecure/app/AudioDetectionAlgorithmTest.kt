package org.shesecure.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.log10
import kotlin.math.sqrt

class AudioDetectionAlgorithmTest {

    private class AudioDetector(
        private val dbThreshold: Double = 80.0,
        private val sustainedDurationMs: Long = 1000L
    ) {
        var loudStartTime = 0L
        var triggerCount = 0

        fun processAudioChunk(samples: ShortArray, timestamp: Long): Boolean {
            var sum = 0.0
            for (s in samples) {
                sum += s * s
            }
            val rms = sqrt(sum / samples.size)
            val db = if (rms > 1.0) 20.0 * log10(rms / 0.1) else 0.0

            if (db >= dbThreshold) {
                if (loudStartTime == 0L) {
                    loudStartTime = timestamp
                } else if (timestamp - loudStartTime >= sustainedDurationMs) {
                    loudStartTime = 0L
                    triggerCount++
                    return true
                }
            } else {
                loudStartTime = 0L
            }
            return false
        }
    }

    @Test
    fun testSustainedLoudScreamTriggersSOS() {
        val detector = AudioDetector(dbThreshold = 80.0, sustainedDurationMs = 1000L)
        // High amplitude samples
        val loudBuffer = ShortArray(512) { 20000.toShort() }

        // Chunk at t = 0
        var triggered = detector.processAudioChunk(loudBuffer, 0L)
        assertFalse(triggered)

        // Chunk at t = 500ms
        triggered = detector.processAudioChunk(loudBuffer, 500L)
        assertFalse(triggered)

        // Chunk at t = 1050ms (sustained > 1000ms)
        triggered = detector.processAudioChunk(loudBuffer, 1050L)
        assertTrue("Sustained scream (>1s) MUST trigger SOS", triggered)
        assertEquals(1, detector.triggerCount)
    }

    @Test
    fun testMomentarySpikeDoesNotTrigger() {
        val detector = AudioDetector(dbThreshold = 80.0, sustainedDurationMs = 1000L)
        val loudBuffer = ShortArray(512) { 20000.toShort() }
        val quietBuffer = ShortArray(512) { 200.toShort() }

        // Spike at t = 0
        detector.processAudioChunk(loudBuffer, 0L)
        // Quiet at t = 200ms (e.g. door slam or brief drop)
        detector.processAudioChunk(quietBuffer, 200L)
        // Quiet at t = 1050ms
        val triggered = detector.processAudioChunk(quietBuffer, 1050L)

        assertFalse("Momentary noise spike should NOT trigger SOS", triggered)
        assertEquals(0, detector.triggerCount)
    }
}
