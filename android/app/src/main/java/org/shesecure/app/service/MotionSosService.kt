package org.shesecure.app.service

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.IBinder
import androidx.core.app.NotificationCompat
import org.shesecure.app.R
import org.shesecure.app.SheSecureApp
import org.shesecure.app.control.SosActionHandler
import org.shesecure.app.control.SosTriggerSource
import org.shesecure.app.ui.MainActivity
import java.util.ArrayDeque
import kotlin.math.sqrt

class MotionSosService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null

    // Sliding window of timestamps (in milliseconds) for jerks
    private val jerkTimestamps = ArrayDeque<Long>()
    private val JERK_WINDOW_MS = 1500L // 1.5 seconds window (Slide 12)
    private val REQUIRED_JERKS = 3     // 3 jerks (Slide 12)
    private var lastJerkTime = 0L
    private val MIN_INTERVAL_BETWEEN_JERKS_MS = 250L // Filter out same-peak continuous sample

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createServiceNotification()
        startForeground(NOTIFICATION_ID, notification)

        accelerometer?.let { sensor ->
            sensorManager.registerListener(
                this,
                sensor,
                SensorManager.SENSOR_DELAY_GAME
            )
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        sensorManager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null || event.sensor.type != Sensor.TYPE_ACCELEROMETER) return

        val app = application as SheSecureApp
        if (!app.settingsManager.isMotionDetectionEnabled) return

        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]

        // Calculate motion magnitude subtracting Earth's gravitational acceleration (~9.8 m/s^2)
        val rawMagnitude = sqrt(x * x + y * y + z * z)
        val deltaMagnitude = Math.abs(rawMagnitude - SensorManager.GRAVITY_EARTH)

        val threshold = app.settingsManager.motionJerkThreshold
        val currentTime = System.currentTimeMillis()

        if (deltaMagnitude >= threshold) {
            if (currentTime - lastJerkTime >= MIN_INTERVAL_BETWEEN_JERKS_MS) {
                lastJerkTime = currentTime
                recordJerk(currentTime)
            }
        }
    }

    private fun recordJerk(timestamp: Long) {
        // Clean out jerks older than the 1.5-second sliding window
        while (jerkTimestamps.isNotEmpty() && (timestamp - jerkTimestamps.peekFirst() > JERK_WINDOW_MS)) {
            jerkTimestamps.pollFirst()
        }

        jerkTimestamps.addLast(timestamp)

        // Check if condition (3 jerks in 1.5s) is met
        if (jerkTimestamps.size >= REQUIRED_JERKS) {
            jerkTimestamps.clear()
            // Forward to Single Shared Alert Pathway (Slide 7 & 12)
            SosActionHandler.initiateSos(applicationContext, SosTriggerSource.MOTION_ACCELEROMETER)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createServiceNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, SheSecureApp.CHANNEL_MOTION_SERVICE)
            .setContentTitle("SheSecure Motion Guard Active")
            .setContentText("Monitoring background motion (3 jerks / 1.5s detection)")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    companion object {
        private const val NOTIFICATION_ID = 2001

        fun startService(context: Context) {
            val intent = Intent(context, MotionSosService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, MotionSosService::class.java)
            context.stopService(intent)
        }
    }
}
