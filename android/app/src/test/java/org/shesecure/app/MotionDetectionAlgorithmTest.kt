package org.shesecure.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.ArrayDeque
import kotlin.math.sqrt

class MotionDetectionAlgorithmTest {

    private class JerkDetector(
        private val threshold: Float = 14.5f,
        private val windowMs: Long = 1500L,
        private val requiredJerks: Int = 3
    ) {
        val timestamps = ArrayDeque<Long>()
        var triggerCount = 0
        var lastJerkTime = 0L

        fun processSample(x: Float, y: Float, z: Float, timestamp: Long): Boolean {
            val magnitude = sqrt(x * x + y * y + z * z)
            val delta = Math.abs(magnitude - 9.8f)

            if (delta >= threshold) {
                if (timestamp - lastJerkTime >= 250L) {
                    lastJerkTime = timestamp

                    while (timestamps.isNotEmpty() && (timestamp - timestamps.peekFirst() > windowMs)) {
                        timestamps.pollFirst()
                    }
                    timestamps.addLast(timestamp)

                    if (timestamps.size >= requiredJerks) {
                        timestamps.clear()
                        triggerCount++
                        return true
                    }
                }
            }
            return false
        }
    }

    @Test
    fun testThreeJerksWithinWindowTriggersSOS() {
        val detector = JerkDetector(threshold = 14.0f, windowMs = 1500L, requiredJerks = 3)

        // Jerk 1 at t = 100ms
        var triggered = detector.processSample(0f, 25f, 0f, 100L)
        assertFalse("1st jerk should not trigger", triggered)

        // Jerk 2 at t = 500ms
        triggered = detector.processSample(26f, 0f, 0f, 500L)
        assertFalse("2nd jerk should not trigger", triggered)

        // Jerk 3 at t = 1100ms (within 1500ms window)
        triggered = detector.processSample(0f, 0f, 27f, 1100L)
        assertTrue("3rd jerk within 1.5s window MUST trigger SOS", triggered)
        assertEquals(1, detector.triggerCount)
    }

    @Test
    fun testSlowJerksOutsideWindowDoNotTrigger() {
        val detector = JerkDetector(threshold = 14.0f, windowMs = 1500L, requiredJerks = 3)

        // Jerk 1 at t = 100ms
        detector.processSample(25f, 0f, 0f, 100L)

        // Jerk 2 at t = 2000ms (1.9s later -> Jerk 1 expired from 1.5s window)
        detector.processSample(25f, 0f, 0f, 2000L)

        // Jerk 3 at t = 3800ms (1.8s later -> Jerk 2 expired)
        val triggered = detector.processSample(25f, 0f, 0f, 3800L)

        assertFalse("Slow accidental bumps outside 1.5s window should NOT trigger SOS", triggered)
        assertEquals(0, detector.triggerCount)
    }

    @Test
    fun testNormalWalkingMotionDoesNotTrigger() {
        val detector = JerkDetector(threshold = 14.5f)

        // Simulate 10 gentle walking steps (delta < 5 m/s^2)
        for (i in 1..10) {
            val triggered = detector.processSample(1.2f, 9.9f, 2.1f, i * 400L)
            assertFalse("Normal gentle motion should not trigger", triggered)
        }
        assertEquals(0, detector.triggerCount)
    }
}
