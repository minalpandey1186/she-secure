package org.shesecure.app.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ContactDao {
    @Query("SELECT * FROM emergency_contacts ORDER BY is_primary DESC, id ASC")
    fun getAllContactsFlow(): Flow<List<ContactEntity>>

    @Query("SELECT * FROM emergency_contacts ORDER BY is_primary DESC, id ASC")
    suspend fun getAllContactsSync(): List<ContactEntity>

    @Query("SELECT COUNT(*) FROM emergency_contacts")
    suspend fun getContactCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertContact(contact: ContactEntity): Long

    @Update
    suspend fun updateContact(contact: ContactEntity)

    @Delete
    suspend fun deleteContact(contact: ContactEntity)

    @Query("DELETE FROM emergency_contacts WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("UPDATE emergency_contacts SET is_primary = 0")
    suspend fun clearPrimaryStatus()

    @Transaction
    suspend fun setPrimaryContact(id: Long) {
        clearPrimaryStatus()
        setPrimaryFlag(id)
    }

    @Query("UPDATE emergency_contacts SET is_primary = 1 WHERE id = :id")
    suspend fun setPrimaryFlag(id: Long)
}
