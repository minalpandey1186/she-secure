package org.shesecure.app.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import org.shesecure.app.data.local.ContactEntity
import org.shesecure.app.databinding.ItemContactBinding

class ContactsAdapter(
    private val onContactClick: (ContactEntity) -> Unit,
    private val onDeleteClick: (ContactEntity) -> Unit
) : ListAdapter<ContactEntity, ContactsAdapter.ContactViewHolder>(ContactDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ContactViewHolder {
        val binding = ItemContactBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ContactViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ContactViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ContactViewHolder(private val binding: ItemContactBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(contact: ContactEntity) {
            val initial = contact.name.trim().take(1).uppercase()
            binding.tvAvatarInitials.text = if (initial.isNotEmpty()) initial else "E"
            binding.tvContactName.text = contact.name
            binding.tvContactPhone.text = "📱 ${contact.phoneNumber}"

            if (!contact.email.isNullOrBlank()) {
                binding.tvContactEmail.visibility = View.VISIBLE
                binding.tvContactEmail.text = "✉️ ${contact.email}"
            } else {
                binding.tvContactEmail.visibility = View.GONE
            }

            binding.tvContactRelation.text = contact.relationship
            binding.tvPrimaryBadge.visibility = if (contact.isPrimary) View.VISIBLE else View.GONE

            binding.root.setOnClickListener {
                onContactClick(contact)
            }

            binding.btnDeleteContact.setOnClickListener {
                onDeleteClick(contact)
            }
        }
    }

    class ContactDiffCallback : DiffUtil.ItemCallback<ContactEntity>() {
        override fun areItemsTheSame(oldItem: ContactEntity, newItem: ContactEntity): Boolean =
            oldItem.id == newItem.id

        override fun areContentsTheSame(oldItem: ContactEntity, newItem: ContactEntity): Boolean =
            oldItem == newItem
    }
}
