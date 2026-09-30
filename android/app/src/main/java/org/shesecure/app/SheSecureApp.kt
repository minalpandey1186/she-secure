package org.shesecure.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import org.shesecure.app.data.local.AppDatabase
import org.shesecure.app.data.pref.SettingsManager

class SheSecureApp : Application() {

    lateinit var database: AppDatabase
        private set

    lateinit var settingsManager: SettingsManager
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        database = AppDatabase.getDatabase(this)
        settingsManager = SettingsManager(this)

        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Motion Service Channel
            val motionChannel = NotificationChannel(
                CHANNEL_MOTION_SERVICE,
                "SheSecure Motion Detection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors background accelerometer jerks for emergency detection"
            }

            // Audio Service Channel
            val audioChannel = NotificationChannel(
                CHANNEL_AUDIO_SERVICE,
                "SheSecure Audio Threat Detection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors ambient audio amplitude for scream and threat detection"
            }

            // SOS Alert Channel
            val alertChannel = NotificationChannel(
                CHANNEL_SOS_ALERT,
                "SheSecure Critical SOS Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Displays critical SOS dispatch notifications and status"
                enableVibration(true)
            }

            notificationManager.createNotificationChannels(listOf(motionChannel, audioChannel, alertChannel))
        }
    }

    companion object {
        const val CHANNEL_MOTION_SERVICE = "channel_motion_service"
        const val CHANNEL_AUDIO_SERVICE = "channel_audio_service"
        const val CHANNEL_SOS_ALERT = "channel_sos_alert"

        lateinit var instance: SheSecureApp
            private set
    }
}
