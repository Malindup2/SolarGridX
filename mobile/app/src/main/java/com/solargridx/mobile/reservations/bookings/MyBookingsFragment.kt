package com.solargridx.mobile.reservations.bookings

import com.solargridx.mobile.reservations.ui.cascadeIn
import android.os.Bundle
import android.view.View
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.solargridx.mobile.R
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.ui.ReservationAdapter
import com.solargridx.mobile.reservations.ui.ReservationSearch
import com.solargridx.mobile.reservations.ui.SearchBar
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.session.SessionManager

/**
 * The prosumer's bookings behind Upcoming / History pills, grouped by day.
 * GET /reservations (the API returns only their own).
 */
class MyBookingsFragment : Fragment(R.layout.fragment_my_bookings) {

    private val viewModel: MyBookingsViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        // A navigation-bar tab: no back arrow. Operators see every reservation here.
        val isOperator = SessionManager(requireContext()).getRole() == "GridOperator"
        view.findViewById<MaterialToolbar>(R.id.toolbar).apply {
            title = getString(if (isOperator) R.string.nav_reservations else R.string.res_my_bookings)
            inflateMenu(R.menu.menu_res_refresh)
            setOnMenuItemClickListener { item ->
                if (item.itemId == R.id.actionRefresh) { viewModel.load(); true } else false
            }
        }

        val list = view.findViewById<RecyclerView>(R.id.list)
        val chips = view.findViewById<ChipGroup>(R.id.filterChips)
        val chipUpcoming = view.findViewById<Chip>(R.id.chipUpcoming)
        val chipHistory = view.findViewById<Chip>(R.id.chipHistory)
        val emptyAction = view.findViewById<MaterialButton>(R.id.emptyAction)
        val clearSearch = view.findViewById<View>(R.id.clearSearch)
        val states = StateViews(view) { viewModel.load() }
        val adapter = ReservationAdapter(showNic = isOperator) { reservation ->
            val action = if (isOperator) R.id.action_myBookings_to_operatorReview else R.id.action_myBookings_to_bookingDetails
            findNavController().navigate(action, ReservationArgs.idBundle(reservation.id))
        }
        list.layoutManager = LinearLayoutManager(requireContext())
        list.adapter = adapter

        emptyAction.setOnClickListener {
            findNavController().navigate(
                R.id.action_myBookings_to_slotPicker,
                bundleOf(ReservationArgs.PICKER_MODE to ReservationArgs.MODE_BOOK)
            )
        }

        var shownTab = -1
        fun render() {
            val data = (viewModel.state.value as? UiState.Content)?.data ?: return
            val names = viewModel.names.value
            val upcomingItems = ReservationSearch.filter(data.upcoming, viewModel.query, names)
            val historyItems = ReservationSearch.filter(data.history, viewModel.query, names)
            chipUpcoming.text = getString(R.string.res_filter_count, getString(R.string.res_tab_upcoming), upcomingItems.size)
            chipHistory.text = getString(R.string.res_filter_count, getString(R.string.res_tab_history), historyItems.size)

            val upcoming = viewModel.selectedTab == 0
            val items = if (upcoming) upcomingItems else historyItems
            val searching = viewModel.query.isNotBlank()
            clearSearch.isVisible = items.isEmpty() && searching
            adapter.submitReservations(items)
            if (shownTab != viewModel.selectedTab) {
                shownTab = viewModel.selectedTab
                list.cascadeIn()
            }
            list.isVisible = items.isNotEmpty()
            emptyAction.isVisible = items.isEmpty() && upcoming && !isOperator && !searching
            when {
                items.isNotEmpty() -> states.hide()
                searching -> states.showEmpty(
                    getString(R.string.res_no_results_title, viewModel.query.trim()),
                    getString(R.string.res_no_results_body),
                    R.drawable.ic_res_search
                )
                upcoming -> states.showEmpty(
                    getString(R.string.res_empty_upcoming_title), getString(R.string.res_empty_upcoming_body), R.drawable.ic_res_calendar
                )
                else -> states.showEmpty(getString(R.string.res_empty_history_title), getString(R.string.res_empty_history_body))
            }
        }

        SearchBar(
            view.findViewById(R.id.search),
            if (isOperator) R.string.res_search_hint else R.string.res_search_hint_prosumer
        ) { query ->
            viewModel.query = query
            render()
        }.also { bar -> clearSearch.setOnClickListener { bar.clear() } }

        if (isOperator) {
            viewModel.loadNames()
            collectWhileStarted(viewModel.names) { names ->
                adapter.names = names
                render()
            }
        }

        chips.check(if (viewModel.selectedTab == 0) R.id.chipUpcoming else R.id.chipHistory)
        chips.setOnCheckedStateChangeListener { _, ids ->
            viewModel.selectedTab = if (ids.firstOrNull() == R.id.chipHistory) 1 else 0
            render()
        }

        collectWhileStarted(viewModel.state) { state ->
            when (state) {
                is UiState.Loading -> { list.isVisible = false; emptyAction.isVisible = false; states.showLoading() }
                is UiState.Error -> { list.isVisible = false; emptyAction.isVisible = false; states.showError(state.error) }
                is UiState.Content -> render()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        viewModel.load()
    }
}
