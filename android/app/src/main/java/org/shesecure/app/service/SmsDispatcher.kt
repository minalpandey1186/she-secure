package org.shesecure.app.service

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import org.shesecure.app.data.local.ContactEntity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class SmsContactDeliveryStatus(
    val contactName: String,
    val phoneNumber: String,
    val isSuccess: Boolean,
    val message: String
)

data class SosSmsReport(
    val totalContacts: Int,
    val sentCount: Int,
    val failedCount: Int,
    val messageBody: String,
    val details: List<SmsContactDeliveryStatus>
)

class SmsDispatcher(private val context: Context) {

    fun dispatchEmergencySms(
        contacts: List<ContactEntity>,
        template: String,
        locationResult: SosLocationResult
    ): SosSmsReport {
        if (contacts.isEmpty()) {
            return SosSmsReport(
                totalContacts = 0,
                sentCount = 0,
                failedCount = 0,
                messageBody = "",
                details = listOf(
                    SmsContactDeliveryStatus(
                        contactName = "None",
                        phoneNumber = "",
                        isSuccess = false,
                        message = "FAIL-VISIBLY: No emergency contacts saved in Room Database."
                    )
                )
            )
        }

        val currentTime = SimpleDateFormat("HH:mm:ss dd-MM-yyyy", Locale.getDefault()).format(Date())
        val formattedBody = template
            .replace("{LOCATION}", locationResult.googleMapsUrl)
            .replace("{ACCURACY}", locationResult.accuracyMeters.toInt().toString())
            .replace("{TIME}", currentTime)

        val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }

        val results = mutableListOf<SmsContactDeliveryStatus>()
        var sentSuccess = 0
        var sentFailed = 0

        for (contact in contacts) {
            val phone = contact.phoneNumber.trim().replace(" ", "").replace("-", "")
            if (phone.isEmpty()) {
                results.add(
                    SmsContactDeliveryStatus(
                        contactName = contact.name,
                        phoneNumber = phone,
                        isSuccess = false,
                        message = "FAIL-VISIBLY: Invalid or blank phone number"
                    )
                )
                sentFailed++
                continue
            }

            try {
                val parts = smsManager.divideMessage(formattedBody)
                if (parts.size > 1) {
                    smsManager.sendMultipartTextMessage(phone, null, parts, null, null)
                } else {
                    smsManager.sendTextMessage(phone, null, formattedBody, null, null)
                }

                results.add(
                    SmsContactDeliveryStatus(
                        contactName = contact.name,
                        phoneNumber = phone,
                        isSuccess = true,
                        message = "Dispatched via SMS (${parts.size} segment(s))"
                    )
                )
                sentSuccess++
            } catch (e: SecurityException) {
                results.add(
                    SmsContactDeliveryStatus(
                        contactName = contact.name,
                        phoneNumber = phone,
                        isSuccess = false,
                        message = "FAIL-VISIBLY: SMS Permission (SEND_SMS) denied by OS"
                    )
                )
                sentFailed++
            } catch (e: Exception) {
                results.add(
                    SmsContactDeliveryStatus(
                        contactName = contact.name,
                        phoneNumber = phone,
                        isSuccess = false,
                        message = "FAIL-VISIBLY: SMS Radio Error - ${e.localizedMessage ?: "Unknown hardware failure"}"
                    )
                )
                sentFailed++
            }
        }

        return SosSmsReport(
            totalContacts = contacts.size,
            sentCount = sentSuccess,
            failedCount = sentFailed,
            messageBody = formattedBody,
            details = results
        )
    }
}
