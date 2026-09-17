package com.solargridx.mobile

import android.app.Application
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.session.SessionManager

class SolarGridXApplication : Application() {

    lateinit var sessionManager: SessionManager
        private set

    override fun onCreate() {
        super.onCreate()
        sessionManager = SessionManager(this)
        ApiClient.init(sessionManager)
    }
}
