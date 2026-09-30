package org.shesecure.app.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "emergency_contacts")
data class ContactEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "phone_number")
    val phoneNumber: String,

    @ColumnInfo(name = "email")
    val email: String? = null,

    @ColumnInfo(name = "relationship")
    val relationship: String = "Trusted Contact",

    @ColumnInfo(name = "is_primary")
    val isPrimary: Boolean = false,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
