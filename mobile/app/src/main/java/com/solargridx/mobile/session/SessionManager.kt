package com.solargridx.mobile.session

import android.content.Context
import com.solargridx.mobile.database.DbHelper

class SessionManager(context: Context) {

    private val dbHelper = DbHelper(context.applicationContext)

    fun saveSession(
        token: String,
        role: String,
        nic: String?,
        displayName: String,
        homeRoute: String,
        mustChangePassword: Boolean
    ) {
        dbHelper.saveSession(token, role, nic, displayName, homeRoute, mustChangePassword)
    }

    fun getToken(): String? = dbHelper.readSession()?.token

    fun getRole(): String? = dbHelper.readSession()?.role

    fun getHomeRoute(): String? = dbHelper.readSession()?.homeRoute

    fun getDisplayName(): String? = dbHelper.readSession()?.displayName

    fun mustChangePassword(): Boolean = dbHelper.readSession()?.mustChangePassword == true

    fun markPasswordChanged() = dbHelper.markPasswordChanged()

    fun isLoggedIn(): Boolean = getToken() != null

    fun clear() = dbHelper.clearSession()
}
