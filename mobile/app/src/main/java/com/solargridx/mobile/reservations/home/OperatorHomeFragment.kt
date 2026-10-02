package com.solargridx.mobile.reservations.home

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.solargridx.mobile.R
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.dto.OperatorDashboardResponse
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.data.StationMemory
import com.solargridx.mobile.reservations.ui.ReservationAdapter
import com.solargridx.mobile.reservations.ui.ReservationSearch
import com.solargridx.mobile.reservations.ui.SearchBar
import com.solargridx.mobile.reservations.ui.cascadeIn
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.reservations.ui.staggerChildrenIn
import com.solargridx.mobile.session.SessionManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Operator home: a green hero for the station being run (with today's numbers),
 * one-tap station pills instead of a dropdown, a search over the pending queue,
 * and the queue itself with prosumer names. GET /dashboard/operator/{stationId}
 */
class OperatorHomeFragment : Fragment(R.layout.fragment_operator_home) {

    private val viewModel: OperatorHomeViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val memory = StationMemory(requireContext())
        val firstName = SessionManager(requireContext()).getDisplayName()?.substringBefore(' ').orEmpty()
        view.findViewById<TextView>(R.id.greeting).text = getString(R.string.res_greeting, firstName)
        view.findViewById<TextView>(R.id.today).text = SimpleDateFormat("EEEE, d MMMM", Locale.getDefault()).format(Date())

        val stationChips = view.findViewById<ChipGroup>(R.id.stationChips)
        val heroStation = view.findViewById<TextView>(R.id.heroStation)
        val heroPending = view.findViewById<TextView>(R.id.heroPending)
        val heroApproved = view.findViewById<TextView>(R.id.heroApproved)
        val content = view.findViewById<View>(R.id.content)
        val queueList = view.findViewById<RecyclerView>(R.id.queueList)
        val queueEmpty = view.findViewById<View>(R.id.queueEmpty)
        val queueEmptyIcon = view.findViewById<ImageView>(R.id.queueEmptyIcon)
        val queueEmptyTitle = view.findViewById<TextView>(R.id.queueEmptyTitle)
        val queueEmptyBody = view.findViewById<TextView>(R.id.queueEmptyBody)
        val clearSearch = view.findViewById<View>(R.id.clearSearch)
        val states = StateViews(view) { viewModel.refresh() }

        val adapter = ReservationAdapter(showNic = true, showStation = false) { reservation ->
            findNavController().navigate(R.id.action_operatorHome_to_operatorReview, ReservationArgs.idBundle(reservation.id))
        }
        queueList.layoutManager = LinearLayoutManager(requireContext())
        queueList.adapter = adapter

        view.findViewById<MaterialToolbar>(R.id.toolbar).setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.actionRefresh -> { viewModel.refresh(); true }
                R.id.actionManageSlots -> { findNavController().navigate(R.id.operatorSlotsFragment); true }
                else -> false
            }
        }

        fun renderQueue(data: OperatorDashboardResponse) {
            val filtered = ReservationSearch.filter(data.pendingReservations, viewModel.query, viewModel.names.value)
            adapter.submitReservations(filtered)
            queueList.isVisible = filtered.isNotEmpty()
            queueEmpty.isVisible = filtered.isEmpty()
            // "No results" only when a search hid real items; otherwise the queue is genuinely empty.
            val noResults = viewModel.query.isNotBlank() && data.pendingReservations.isNotEmpty()
            clearSearch.isVisible = noResults
            if (noResults) {
                queueEmptyIcon.setImageResource(R.drawable.ic_res_search)
                queueEmptyTitle.text = getString(R.string.res_no_results_title, viewModel.query.trim())
                queueEmptyBody.setText(R.string.res_no_results_body)
            } else {
                queueEmptyIcon.setImageResource(R.drawable.ic_res_check)
                queueEmptyTitle.setText(R.string.res_queue_empty_title)
                queueEmptyBody.setText(R.string.res_queue_empty_body)
            }
        }

        val search = SearchBar(view.findViewById(R.id.search)) { query ->
            viewModel.query = query
            (viewModel.dashboard.value as? UiState.Content)?.data?.let { renderQueue(it) }
        }
        clearSearch.setOnClickListener { search.clear() }

        collectWhileStarted(viewModel.stations) { state ->
            when (state) {
                is UiState.Loading -> Unit
                is UiState.Error -> states.showError(state.error)
                is UiState.Content -> {
                    val stations = state.data
                    stationChips.removeAllViews()
                    stations.forEach { station ->
                        val chip = layoutInflater.inflate(R.layout.item_day_chip, stationChips, false) as Chip
                        chip.id = View.generateViewId()
                        chip.text = station.stationName
                        chip.tag = station.id
                        chip.setOnClickListener {
                            heroStation.text = station.stationName
                            memory.stationId = station.id
                            viewModel.selectStation(station.id)
                        }
                        stationChips.addView(chip)
                    }
                    // Remembered station, else the first one, so the home is never empty.
                    val selected = stations.firstOrNull { it.id == (viewModel.selectedStationId ?: memory.stationId) }
                        ?: stations.firstOrNull()
                    if (selected != null) {
                        heroStation.text = selected.stationName
                        (0 until stationChips.childCount).map { stationChips.getChildAt(it) }
                            .firstOrNull { it.tag == selected.id }?.let { stationChips.check(it.id) }
                        if (viewModel.selectedStationId == null) viewModel.selectStation(selected.id)
                    }
                }
            }
        }

        collectWhileStarted(viewModel.names) { names ->
            adapter.names = names
            (viewModel.dashboard.value as? UiState.Content)?.data?.let { renderQueue(it) }
        }

        collectWhileStarted(viewModel.dashboard) { state ->
            when (state) {
                null -> content.isVisible = false
                is UiState.Loading -> {
                    content.isVisible = false
                    states.showLoading()
                }
                is UiState.Error -> {
                    content.isVisible = false
                    states.showError(state.error)
                }
                is UiState.Content -> {
                    states.hide()
                    if (!content.isVisible) (content as ViewGroup).staggerChildrenIn()
                    content.isVisible = true
                    val data = state.data
                    heroStation.text = data.stationName
                    heroPending.text = data.pendingCount.toString()
                    heroApproved.text = data.approvedFutureCount.toString()
                    renderQueue(data)
                    queueList.cascadeIn()
                }
            }
        }

        viewModel.loadStations()
    }

    override fun onResume() {
        super.onResume()
        // Coming back from a decision: the queue has changed.
        viewModel.refresh()
    }
}
