package org.shesecure.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(entities = [ContactEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    abstract fun contactDao(): ContactDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "she_secure_db"
                )
                    .addCallback(DatabaseCallback())
                    .build()
                INSTANCE = instance
                instance
            }
        }

        private class DatabaseCallback : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                INSTANCE?.let { database ->
                    CoroutineScope(Dispatchers.IO).launch {
                        populateInitialContacts(database.contactDao())
                    }
                }
            }

            suspend fun populateInitialContacts(contactDao: ContactDao) {
                // Seed with initial emergency responder / sample contact if empty
                contactDao.insertContact(
                    ContactEntity(
                        name = "National Emergency (112)",
                        phoneNumber = "112",
                        relationship = "Emergency Services",
                        isPrimary = true
                    )
                )
                contactDao.insertContact(
                    ContactEntity(
                        name = "Women Helpline",
                        phoneNumber = "1091",
                        relationship = "Helpline",
                        isPrimary = false
                    )
                )
            }
        }
    }
}
