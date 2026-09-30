package org.shesecure.app.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.CheckBox
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import org.shesecure.app.R
import org.shesecure.app.SheSecureApp
import org.shesecure.app.data.local.ContactEntity
import org.shesecure.app.databinding.ActivityContactsBinding

class ContactsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityContactsBinding
    private lateinit var app: SheSecureApp
    private lateinit var adapter: ContactsAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityContactsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        app = application as SheSecureApp

        setupRecyclerView()
        setupListeners()
        observeContacts()
    }

    private fun setupRecyclerView() {
        adapter = ContactsAdapter(
            onContactClick = { contact ->
                showEditContactDialog(contact)
            },
            onDeleteClick = { contact ->
                showDeleteConfirmDialog(contact)
            }
        )

        binding.rvContacts.layoutManager = LinearLayoutManager(this)
        binding.rvContacts.adapter = adapter
    }

    private fun setupListeners() {
        binding.btnBack.setOnClickListener {
            finish()
        }

        binding.btnAddContact.setOnClickListener {
            showAddContactDialog()
        }
    }

    private fun observeContacts() {
        lifecycleScope.launch {
            app.database.contactDao().getAllContactsFlow().collectLatest { contacts ->
                adapter.submitList(contacts)
                if (contacts.isEmpty()) {
                    binding.tvEmptyContacts.visibility = View.VISIBLE
                    binding.rvContacts.visibility = View.GONE
                } else {
                    binding.tvEmptyContacts.visibility = View.GONE
                    binding.rvContacts.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun showAddContactDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_add_contact, null)
        val etName = dialogView.findViewById<EditText>(R.id.etDialogName)
        val etPhone = dialogView.findViewById<EditText>(R.id.etDialogPhone)
        val etEmail = dialogView.findViewById<EditText>(R.id.etDialogEmail)
        val etRelation = dialogView.findViewById<EditText>(R.id.etDialogRelation)
        val cbPrimary = dialogView.findViewById<CheckBox>(R.id.cbDialogPrimary)

        AlertDialog.Builder(this)
            .setTitle("Add Emergency Contact")
            .setView(dialogView)
            .setPositiveButton("Save") { _, _ ->
                val name = etName.text.toString().trim()
                val phone = etPhone.text.toString().trim()
                val email = etEmail.text.toString().trim().ifEmpty { null }
                val relation = etRelation.text.toString().trim().ifEmpty { "Trusted Contact" }
                val isPrimary = cbPrimary.isChecked

                if (name.isNotEmpty() && phone.isNotEmpty()) {
                    lifecycleScope.launch {
                        val contact = ContactEntity(
                            name = name,
                            phoneNumber = phone,
                            email = email,
                            relationship = relation,
                            isPrimary = isPrimary
                        )
                        val id = app.database.contactDao().insertContact(contact)
                        if (isPrimary) {
                            app.database.contactDao().setPrimaryContact(id)
                        }
                        Toast.makeText(this@ContactsActivity, "Contact saved to Room DB", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Toast.makeText(this, "Name and Phone Number are required", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showEditContactDialog(contact: ContactEntity) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_add_contact, null)
        val etName = dialogView.findViewById<EditText>(R.id.etDialogName)
        val etPhone = dialogView.findViewById<EditText>(R.id.etDialogPhone)
        val etEmail = dialogView.findViewById<EditText>(R.id.etDialogEmail)
        val etRelation = dialogView.findViewById<EditText>(R.id.etDialogRelation)
        val cbPrimary = dialogView.findViewById<CheckBox>(R.id.cbDialogPrimary)

        etName.setText(contact.name)
        etPhone.setText(contact.phoneNumber)
        etEmail.setText(contact.email ?: "")
        etRelation.setText(contact.relationship)
        cbPrimary.isChecked = contact.isPrimary

        AlertDialog.Builder(this)
            .setTitle("Edit Emergency Contact")
            .setView(dialogView)
            .setPositiveButton("Update") { _, _ ->
                val name = etName.text.toString().trim()
                val phone = etPhone.text.toString().trim()
                val email = etEmail.text.toString().trim().ifEmpty { null }
                val relation = etRelation.text.toString().trim().ifEmpty { "Trusted Contact" }
                val isPrimary = cbPrimary.isChecked

                if (name.isNotEmpty() && phone.isNotEmpty()) {
                    lifecycleScope.launch {
                        val updated = contact.copy(
                            name = name,
                            phoneNumber = phone,
                            email = email,
                            relationship = relation,
                            isPrimary = isPrimary
                        )
                        app.database.contactDao().updateContact(updated)
                        if (isPrimary) {
                            app.database.contactDao().setPrimaryContact(contact.id)
                        }
                        Toast.makeText(this@ContactsActivity, "Contact updated", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showDeleteConfirmDialog(contact: ContactEntity) {
        AlertDialog.Builder(this)
            .setTitle("Delete Contact")
            .setMessage("Are you sure you want to remove ${contact.name} from emergency contacts?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    app.database.contactDao().deleteContact(contact)
                    Toast.makeText(this@ContactsActivity, "Contact removed", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
