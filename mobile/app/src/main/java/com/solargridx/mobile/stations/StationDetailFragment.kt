package com.solargridx.mobile.stations

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.android.material.button.MaterialButton
import com.google.android.material.snackbar.Snackbar
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.StationApi
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.FactRows
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.dto.SolarStationInfo
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.setupBackToolbar
import com.solargridx.mobile.session.SessionManager
import kotlinx.coroutines.launch

/**
 * One station (M3). Prosumers continue to the slot picker with this station already
 * chosen (the M3 → M4/M1 hand-off passes stationId); operators open its slots.
 */
class StationDetailFragment : Fragment(R.layout.fragment_station_detail) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupBackToolbar(view, getString(R.string.station_detail_title))
        val id = requireArguments().getString(StationsHomeFragment.ARG_STATION_ID).orEmpty()
        val states = StateViews(view) { load(view, id) }
        this.states = states
        load(view, id)
    }

    private var states: StateViews? = null

    private fun load(view: View, id: String) {
        val states = states ?: return
        val content = view.findViewById<View>(R.id.content)
        content.isVisible = false
        states.showLoading()
        viewLifecycleOwner.lifecycleScope.launch {
            when (val result = safeApiCall { ApiClient.retrofit.create(StationApi::class.java).get(id) }) {
                is ApiResult.Failure -> states.showError(result.error)
                is ApiResult.Success -> {
                    states.hide()
                    bind(view, result.data)
                    content.isVisible = true
                }
            }
        }
    }

    private fun bind(view: View, station: SolarStationInfo) {
        val active = station.status == "Active"
        val isOperator = SessionManager(requireContext()).getRole() == "GridOperator"
        val schedule = station.operationalSchedule

        view.findViewById<TextView>(R.id.stationName).text = station.stationName
        view.findViewById<TextView>(R.id.stationStatus).apply {
            text = if (active) station.type + " · " + getString(R.string.slots_online) else getString(R.string.stations_inactive)
            setTextColor(ContextCompat.getColor(requireContext(), if (active) R.color.status_approved else R.color.status_rejected))
        }

        val basics = listOf(
            FactRows.Fact(R.drawable.ic_res_pin, getString(R.string.station_address), station.location),
            FactRows.Fact(R.drawable.ic_res_bolt, getString(R.string.station_capacity), Formatters.kwh(station.capacityKwh)),
            FactRows.Fact(R.drawable.ic_res_battery, getString(R.string.station_bays), getString(R.string.station_bays_value, station.batterySlotCount)),
            FactRows.Fact(R.drawable.ic_res_tag, getString(R.string.station_type), station.type)
        )
        // Same hours every day: one line. Some days differ: one line per operating day.
        val hours = if (StationHours.hasPerDayHours(schedule)) {
            StationHours.perDay(schedule).map { (day, range) -> FactRows.Fact(R.drawable.ic_res_clock, day, getString(R.string.station_hours_value_utc, range)) }
        } else {
            listOf(
                FactRows.Fact(R.drawable.ic_res_clock, getString(R.string.station_hours), getString(R.string.station_hours_value, schedule.openTime, schedule.closeTime)),
                FactRows.Fact(
                    R.drawable.ic_res_calendar, getString(R.string.station_days),
                    if (schedule.activeDays.size == 7) getString(R.string.station_every_day) else schedule.activeDays.joinToString(", ") { it.take(3) }
                )
            )
        }
        FactRows.bind(view.findViewById<LinearLayout>(R.id.factsContainer), basics + hours)

        view.findViewById<MaterialButton>(R.id.primaryAction).apply {
            if (isOperator) {
                setText(R.string.station_manage_slots)
                isEnabled = true
                setOnClickListener {
                    findNavController().navigate(R.id.operatorSlotsFragment, bundleOf(ReservationArgs.STATION_ID to station.id))
                }
            } else {
                setText(R.string.station_book)
                // Only active stations take bookings; the API enforces it, this avoids a dead end.
                isEnabled = active
                setOnClickListener {
                    findNavController().navigate(
                        R.id.slotPickerFragment,
                        bundleOf(ReservationArgs.STATION_ID to station.id, ReservationArgs.PICKER_MODE to ReservationArgs.MODE_BOOK)
                    )
                }
            }
        }

        view.findViewById<MaterialButton>(R.id.directionsAction).setOnClickListener {
            val uri = Uri.parse("geo:${station.latitude},${station.longitude}?q=${station.latitude},${station.longitude}(${Uri.encode(station.stationName)})")
            try {
                startActivity(Intent(Intent.ACTION_VIEW, uri))
            } catch (e: ActivityNotFoundException) {
                Snackbar.make(view, "${station.latitude}, ${station.longitude}", Snackbar.LENGTH_LONG).show()
            }
        }
    }
}
