package com.solargridx.mobile.reservations.data

import android.content.Context
import androidx.core.content.edit

/** Remembers the operator's last picked station on this device (just an id, not sensitive). */
class StationMemory(context: Context) {

    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    var stationId: String?
        get() = prefs.getString(KEY_STATION, null)
        set(value) = prefs.edit { putString(KEY_STATION, value) }

    private companion object {
        const val PREFS = "reservations_prefs"
        const val KEY_STATION = "operator_station_id"
    }
}
