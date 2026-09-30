package org.shesecure.app.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import org.shesecure.app.SheSecureApp
import org.shesecure.app.data.local.ContactEntity
import org.shesecure.app.databinding.ActivityOnboardingBinding

class OnboardingActivity : AppCompatActivity() {

    private lateinit var binding: ActivityOnboardingBinding
    private lateinit var app: SheSecureApp

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityOnboardingBinding.inflate(layoutInflater)
        setContentView(binding.root)

        app = application as SheSecureApp

        binding.btnCompleteOnboarding.setOnClickListener {
            val name = binding.etOnboardingName.text.toString().trim()
            val codeword = binding.etOnboardingCodeWord.text.toString().trim().uppercase()
            val phone = binding.etOnboardingPhone.text.toString().trim()
            val email = binding.etOnboardingEmail.text.toString().trim().ifEmpty { null }

            if (codeword.isEmpty()) {
                Toast.makeText(this, "Please enter a secret emergency code word", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (phone.isEmpty()) {
                Toast.makeText(this, "Please enter an emergency contact phone number for SMS alerts", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Save Settings
            app.settingsManager.userName = if (name.isNotEmpty()) name else "User"
            app.settingsManager.secretCodeWord = codeword
            app.settingsManager.isFirstLaunch = false
            app.settingsManager.isVoiceCodeWordEnabled = true

            // Save Primary Contact to Room DB
            lifecycleScope.launch {
                val primaryContact = ContactEntity(
                    name = if (name.isNotEmpty()) "$name's Guardian" else "Primary Contact",
                    phoneNumber = phone,
                    email = email,
                    relationship = "Emergency Guardian",
                    isPrimary = true
                )
                val id = app.database.contactDao().insertContact(primaryContact)
                app.database.contactDao().setPrimaryContact(id)

                startActivity(Intent(this@OnboardingActivity, MainActivity::class.java))
                finish()
            }
        }
    }
}
