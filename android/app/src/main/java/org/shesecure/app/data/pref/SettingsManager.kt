package org.shesecure.app.data.pref

import android.content.Context
import android.content.SharedPreferences

class SettingsManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var isFirstLaunch: Boolean
        get() = prefs.getBoolean(KEY_FIRST_LAUNCH, true)
        set(value) = prefs.edit().putBoolean(KEY_FIRST_LAUNCH, value).apply()

    var userName: String
        get() = prefs.getString(KEY_USER_NAME, "User") ?: "User"
        set(value) = prefs.edit().putString(KEY_USER_NAME, value).apply()

    var secretCodeWord: String
        get() = prefs.getString(KEY_SECRET_CODEWORD, "HELP") ?: "HELP"
        set(value) = prefs.edit().putString(KEY_SECRET_CODEWORD, value.uppercase().trim()).apply()

    var isVoiceCodeWordEnabled: Boolean
        get() = prefs.getBoolean(KEY_VOICE_CODEWORD_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_VOICE_CODEWORD_ENABLED, value).apply()

    var isMotionDetectionEnabled: Boolean
        get() = prefs.getBoolean(KEY_MOTION_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_MOTION_ENABLED, value).apply()

    var isAudioDetectionEnabled: Boolean
        get() = prefs.getBoolean(KEY_AUDIO_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_AUDIO_ENABLED, value).apply()

    var motionJerkThreshold: Float
        get() = prefs.getFloat(KEY_MOTION_THRESHOLD, DEFAULT_MOTION_THRESHOLD)
        set(value) = prefs.edit().putFloat(KEY_MOTION_THRESHOLD, value).apply()

    var audioDbThreshold: Float
        get() = prefs.getFloat(KEY_AUDIO_THRESHOLD, DEFAULT_AUDIO_DB_THRESHOLD)
        set(value) = prefs.edit().putFloat(KEY_AUDIO_THRESHOLD, value).apply()

    var countdownDurationSeconds: Int
        get() = prefs.getInt(KEY_COUNTDOWN_DURATION, DEFAULT_COUNTDOWN_SECONDS)
        set(value) = prefs.edit().putInt(KEY_COUNTDOWN_DURATION, value).apply()

    var isSirenSoundEnabled: Boolean
        get() = prefs.getBoolean(KEY_SIREN_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_SIREN_ENABLED, value).apply()

    var isVibrationEnabled: Boolean
        get() = prefs.getBoolean(KEY_VIBRATION_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_VIBRATION_ENABLED, value).apply()

    var smsMessageTemplate: String
        get() = prefs.getString(KEY_SMS_TEMPLATE, DEFAULT_SMS_TEMPLATE) ?: DEFAULT_SMS_TEMPLATE
        set(value) = prefs.edit().putString(KEY_SMS_TEMPLATE, value).apply()

    var lastKnownLatitude: Double
        get() = java.lang.Double.longBitsToDouble(prefs.getLong(KEY_LAST_LAT, java.lang.Double.doubleToLongBits(13.1345)))
        set(value) = prefs.edit().putLong(KEY_LAST_LAT, java.lang.Double.doubleToLongBits(value)).apply()

    var lastKnownLongitude: Double
        get() = java.lang.Double.longBitsToDouble(prefs.getLong(KEY_LAST_LNG, java.lang.Double.doubleToLongBits(77.5689)))
        set(value) = prefs.edit().putLong(KEY_LAST_LNG, java.lang.Double.doubleToLongBits(value)).apply()

    companion object {
        private const val PREFS_NAME = "she_secure_prefs"

        private const val KEY_FIRST_LAUNCH = "key_first_launch"
        private const val KEY_USER_NAME = "key_user_name"
        private const val KEY_SECRET_CODEWORD = "key_secret_codeword"
        private const val KEY_VOICE_CODEWORD_ENABLED = "key_voice_codeword_enabled"
        private const val KEY_MOTION_ENABLED = "key_motion_enabled"
        private const val KEY_AUDIO_ENABLED = "key_audio_enabled"
        private const val KEY_MOTION_THRESHOLD = "key_motion_threshold"
        private const val KEY_AUDIO_THRESHOLD = "key_audio_threshold"
        private const val KEY_COUNTDOWN_DURATION = "key_countdown_duration"
        private const val KEY_SIREN_ENABLED = "key_siren_enabled"
        private const val KEY_VIBRATION_ENABLED = "key_vibration_enabled"
        private const val KEY_SMS_TEMPLATE = "key_sms_template"
        private const val KEY_LAST_LAT = "key_last_lat"
        private const val KEY_LAST_LNG = "key_last_lng"

        const val DEFAULT_MOTION_THRESHOLD = 9.5f // Adjusted for responsive phone shake
        const val DEFAULT_AUDIO_DB_THRESHOLD = 80.0f
        const val DEFAULT_COUNTDOWN_SECONDS = 5
        const val DEFAULT_SMS_TEMPLATE =
            "EMERGENCY! I need immediate help! My live location is: {LOCATION} (Accuracy: {ACCURACY}m). Sent via SheSecure Smart Women Safety System."
    }
}
