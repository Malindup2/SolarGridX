package com.solargridx.mobile.api

import com.solargridx.mobile.BuildConfig
import com.solargridx.mobile.session.SessionEvents
import com.solargridx.mobile.session.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory


object ApiClient {

    private var retrofitInstance: Retrofit? = null

    fun init(sessionManager: SessionManager) {
        if (retrofitInstance != null) return

        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY else HttpLoggingInterceptor.Level.NONE
        }

        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val builder = chain.request().newBuilder()
                    .addHeader("X-Client-Type", "mobile")
                val token = sessionManager.getToken()
                if (!token.isNullOrBlank()) {
                    builder.addHeader("Authorization", "Bearer $token")
                }
                val response = chain.proceed(builder.build())

                val path = chain.request().url.encodedPath
                val isAuthCall = path.endsWith("/auth/login") || path.endsWith("/auth/logout")
                if (response.code == 401 && !token.isNullOrBlank() && !isAuthCall) {
                    sessionManager.clear()
                    SessionEvents.notifyExpired()
                }
                response
            }
            .addInterceptor(logging)
            .build()

        retrofitInstance = Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    val retrofit: Retrofit
        get() = retrofitInstance
            ?: error("ApiClient.init() must run before use — see SolarGridXApplication.onCreate()")
}
