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
                $COL_HOME_ROUTE TEXT
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_SESSION")
        onCreate(db)
    }

    fun saveSession(token: String, role: String, nic: String?, displayName: String, homeRoute: String) {
        val values = ContentValues().apply {
            put(COL_ID, SESSION_ROW_ID)
            put(COL_TOKEN, token)
            put(COL_ROLE, role)
            put(COL_NIC, nic)
            put(COL_DISPLAY_NAME, displayName)
            put(COL_HOME_ROUTE, homeRoute)
        }
        writableDatabase.replace(TABLE_SESSION, null, values)
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
                homeRoute = cursor.getString(cursor.getColumnIndexOrThrow(COL_HOME_ROUTE))
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
        val homeRoute: String
    )

    companion object {
        private const val DATABASE_NAME = "solargridx.db"
        private const val DATABASE_VERSION = 1
        private const val SESSION_ROW_ID = 1

        private const val TABLE_SESSION = "session"
        private const val COL_ID = "_id"
        private const val COL_TOKEN = "token"
        private const val COL_ROLE = "role"
        private const val COL_NIC = "nic"
        private const val COL_DISPLAY_NAME = "display_name"
        private const val COL_HOME_ROUTE = "home_route"
    }
}
