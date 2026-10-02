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
        mustChangePassword: Boolean,
        status: String? = null
    ) {
        dbHelper.saveSession(token, role, nic, displayName, homeRoute, mustChangePassword, status)
    }

    fun getStatus(): String? = dbHelper.readSession()?.status

    fun updateStatus(status: String) = dbHelper.updateStatus(status)

    /** A prosumer who registered but hasn't been activated by the Backoffice yet. */
    fun isPendingProsumer(): Boolean = getRole() == "Prosumer" && getStatus() == "Pending"

    fun getToken(): String? = dbHelper.readSession()?.token

    fun getRole(): String? = dbHelper.readSession()?.role

    fun getHomeRoute(): String? = dbHelper.readSession()?.homeRoute

    fun getDisplayName(): String? = dbHelper.readSession()?.displayName

    fun getNic(): String? = dbHelper.readSession()?.nic

    fun mustChangePassword(): Boolean = dbHelper.readSession()?.mustChangePassword == true

    fun markPasswordChanged() = dbHelper.markPasswordChanged()

    fun isLoggedIn(): Boolean = getToken() != null

    fun clear() = dbHelper.clearSession()
}
