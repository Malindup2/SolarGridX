package com.solargridx.mobile.database

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper


class DbHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE $TABLE_SESSION (
                $COL_ID INTEGER PRIMARY KEY,
                $COL_TOKEN TEXT,
                $COL_ROLE TEXT,
                $COL_NIC TEXT,
                $COL_DISPLAY_NAME TEXT,
                $COL_HOME_ROUTE TEXT,
                $COL_MUST_CHANGE_PASSWORD INTEGER NOT NULL DEFAULT 0
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_SESSION")
        onCreate(db)
    }

    fun saveSession(
        token: String,
        role: String,
        nic: String?,
        displayName: String,
        homeRoute: String,
        mustChangePassword: Boolean
    ) {
        val values = ContentValues().apply {
            put(COL_ID, SESSION_ROW_ID)
            put(COL_TOKEN, token)
            put(COL_ROLE, role)
            put(COL_NIC, nic)
            put(COL_DISPLAY_NAME, displayName)
            put(COL_HOME_ROUTE, homeRoute)
            put(COL_MUST_CHANGE_PASSWORD, if (mustChangePassword) 1 else 0)
        }
        writableDatabase.replace(TABLE_SESSION, null, values)
    }

    fun markPasswordChanged() {
        val values = ContentValues().apply { put(COL_MUST_CHANGE_PASSWORD, 0) }
        writableDatabase.update(TABLE_SESSION, values, "$COL_ID = ?", arrayOf(SESSION_ROW_ID.toString()))
    }

    fun readSession(): SessionRow? {
        readableDatabase.query(
            TABLE_SESSION, null, "$COL_ID = ?", arrayOf(SESSION_ROW_ID.toString()),
            null, null, null
        ).use { cursor ->
            if (!cursor.moveToFirst()) return null
            return SessionRow(
                token = cursor.getString(cursor.getColumnIndexOrThrow(COL_TOKEN)),
                role = cursor.getString(cursor.getColumnIndexOrThrow(COL_ROLE)),
                nic = cursor.getString(cursor.getColumnIndexOrThrow(COL_NIC)),
                displayName = cursor.getString(cursor.getColumnIndexOrThrow(COL_DISPLAY_NAME)),
                homeRoute = cursor.getString(cursor.getColumnIndexOrThrow(COL_HOME_ROUTE)),
                mustChangePassword = cursor.getInt(cursor.getColumnIndexOrThrow(COL_MUST_CHANGE_PASSWORD)) == 1
            )
        }
    }

    fun clearSession() {
        writableDatabase.delete(TABLE_SESSION, null, null)
    }

    data class SessionRow(
        val token: String,
        val role: String,
        val nic: String?,
        val displayName: String,
        val homeRoute: String,
        val mustChangePassword: Boolean
    )

    companion object {
        private const val DATABASE_NAME = "solargridx.db"
        private const val DATABASE_VERSION = 2
        private const val SESSION_ROW_ID = 1

        private const val TABLE_SESSION = "session"
        private const val COL_ID = "_id"
        private const val COL_TOKEN = "token"
        private const val COL_ROLE = "role"
        private const val COL_NIC = "nic"
        private const val COL_DISPLAY_NAME = "display_name"
        private const val COL_HOME_ROUTE = "home_route"
        private const val COL_MUST_CHANGE_PASSWORD = "must_change_password"
    }
}
