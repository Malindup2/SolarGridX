package com.solargridx.mobile.reservations.home

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.solargridx.mobile.R
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.dto.OperatorDashboardResponse
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.data.StationMemory
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.ReservationAdapter
import com.solargridx.mobile.reservations.ui.ReservationSearch
import com.solargridx.mobile.reservations.ui.SearchBar
import com.solargridx.mobile.reservations.ui.StatusStyle
import com.solargridx.mobile.reservations.ui.bindStat
import com.solargridx.mobile.reservations.ui.charts.BarChartView
import com.solargridx.mobile.reservations.ui.charts.DonutChartView
import com.solargridx.mobile.reservations.ui.cascadeIn
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.reservations.ui.staggerChildrenIn
import com.solargridx.mobile.session.SessionManager
import com.solargridx.mobile.shell.HomeAvatar
import com.solargridx.mobile.shell.HomeClock
import com.solargridx.mobile.shell.NotificationBell

/**
 * Operator home: the operator's photo and greeting, a green hero for the station being run,
 * one-tap station pills, quick actions (scan, slots, bookings), today's numbers, the next
 * transfer, the top of the pending queue with prosumer names, and demand and mix charts.
 * GET /dashboard/operator/{stationId}, plus that station's reservations and slots.
 */
class OperatorHomeFragment : Fragment(R.layout.fragment_operator_home) {

    private val viewModel: OperatorHomeViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val memory = StationMemory(requireContext())
        val firstName = SessionManager(requireContext()).getDisplayName()?.substringBefore(' ').orEmpty()
        view.findViewById<TextView>(R.id.greeting).text = getString(R.string.res_greeting, firstName)
        HomeClock.bind(this, view.findViewById(R.id.today))
        HomeAvatar.bind(this, SessionManager(requireContext()).getDisplayName().orEmpty())

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
        val queueSeeAll = view.findViewById<MaterialButton>(R.id.queueSeeAll)
        queueSeeAll.setOnClickListener { selectTab(R.id.myBookingsFragment) }
        view.findViewById<View>(R.id.quickScan).setOnClickListener { selectTab(R.id.scan_nav) }
        view.findViewById<View>(R.id.quickBookings).setOnClickListener { selectTab(R.id.myBookingsFragment) }
        view.findViewById<View>(R.id.quickSlots).setOnClickListener {
            findNavController().navigate(R.id.operatorSlotsFragment, bundleOf(ReservationArgs.STATION_ID to viewModel.selectedStationId))
        }
        val states = StateViews(view) { viewModel.refresh() }

        val adapter = ReservationAdapter(showNic = true, showStation = false) { reservation ->
            findNavController().navigate(R.id.action_operatorHome_to_operatorReview, ReservationArgs.idBundle(reservation.id))
        }
        queueList.layoutManager = LinearLayoutManager(requireContext())
        queueList.adapter = adapter

        val toolbar = view.findViewById<MaterialToolbar>(R.id.toolbar)
        NotificationBell.attach(this, toolbar)
        toolbar.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.actionRefresh -> { viewModel.refresh(); true }
                R.id.actionNotifications -> { NotificationBell.open(this); true }
                else -> false
            }
        }

        fun renderQueue(data: OperatorDashboardResponse) {
            val filtered = ReservationSearch.filter(data.pendingReservations, viewModel.query, viewModel.names.value)
            // The dashboard shows the top three; searching shows every match.
            val searching = viewModel.query.isNotBlank()
            adapter.submitReservations(if (searching) filtered else filtered.take(QUEUE_PREVIEW))
            queueSeeAll.isVisible = !searching && filtered.size > QUEUE_PREVIEW
            queueSeeAll.text = getString(R.string.res_queue_see_all, filtered.size)
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

        collectWhileStarted(viewModel.insights) { insights -> bindInsights(view, insights, heroStation.text.toString()) }

        viewModel.loadStations()
    }

    // ---- today's numbers, next transfer and charts -------------------------------------------

    private fun bindInsights(view: View, insights: OperatorInsights?, stationName: String) {
        val top = view.findViewById<View>(R.id.insightsTop)
        val charts = view.findViewById<View>(R.id.chartsGroup)
        top.isVisible = insights != null
        charts.isVisible = insights != null
        if (insights == null) return

        view.findViewById<TextView>(R.id.todayTitle).text = getString(R.string.res_today_title, stationName)
        view.bindStat(R.id.statBookings, insights.bookingsToday.toString(), getString(R.string.res_stat_bookings_today), StatusStyle.COMPLETED, R.drawable.ic_res_calendar)
        view.bindStat(R.id.statCompleted, insights.completedToday.toString(), getString(R.string.res_stat_completed_today), StatusStyle.APPROVED, R.drawable.ic_res_check)
        view.bindStat(R.id.statEnergy, Formatters.kwh(insights.kwhToday).removeSuffix(" kWh") + " kWh", getString(R.string.res_stat_energy_today), StatusStyle.PENDING, R.drawable.ic_res_bolt)
        view.bindStat(
            R.id.statBays,
            if (insights.baysTotal == 0) getString(R.string.res_stat_bays_none)
            else getString(R.string.res_stat_bays_value, insights.baysReserved, insights.baysTotal),
            getString(R.string.res_stat_bays_reserved), null, R.drawable.ic_res_battery
        )

        bindNext(view, insights.next)

        val total = insights.week.sumOf { it.kwh }
        view.findViewById<TextView>(R.id.weekTotal).text = getString(R.string.res_chart_week_total, Formatters.kwh(total))
        view.findViewById<BarChartView>(R.id.weekChart).setData(
            insights.week.map { BarChartView.Bar(it.label, it.kwh.toFloat(), Formatters.kwh(it.kwh).removeSuffix(" kWh")) },
            highlightIndex = 0,
            animate = false
        )
        view.findViewById<DonutChartView>(R.id.statusDonut).setData(
            insights.statusCounts.map { (status, count) -> DonutChartView.Segment(count.toFloat(), color(StatusStyle.of(status).color)) },
            centerValue = insights.total.toString(),
            centerCaption = getString(R.string.nav_reservations).lowercase(),
            animate = false
        )
        val legend = view.findViewById<LinearLayout>(R.id.statusLegend)
        legend.removeAllViews()
        insights.statusCounts.forEach { (status, count) ->
            val row = layoutInflater.inflate(R.layout.item_legend, legend, false)
            val style = StatusStyle.of(status)
            row.findViewById<View>(R.id.legendDot).backgroundTintList = ContextCompat.getColorStateList(requireContext(), style.color)
            row.findViewById<TextView>(R.id.legendLabel).setText(style.label)
            row.findViewById<TextView>(R.id.legendValue).text = count.toString()
            row.contentDescription = "${getString(style.label)}: $count"
            legend.addView(row)
        }
    }

    private fun bindNext(view: View, next: com.solargridx.mobile.dto.ReservationResponse?) {
        val card = view.findViewById<View>(R.id.nextCard)
        val countdown = view.findViewById<TextView>(R.id.nextCountdown)
        val time = view.findViewById<TextView>(R.id.nextTime)
        val who = view.findViewById<TextView>(R.id.nextWho)
        val meta = view.findViewById<TextView>(R.id.nextMeta)
        val empty = view.findViewById<TextView>(R.id.nextEmpty)

        val has = next != null
        countdown.isVisible = has
        time.isVisible = has
        who.isVisible = has
        meta.isVisible = has
        empty.isVisible = !has
        if (next == null) {
            card.setOnClickListener(null)
            card.isClickable = false
            card.contentDescription = getString(R.string.res_next_none_title) + ". " + getString(R.string.res_next_none_body)
            return
        }

        val minutes = Formatters.minutesUntil(next.reservationDate, next.startTime)
        countdown.text = if (minutes <= 0) getString(R.string.res_in_progress) else getString(R.string.res_starts_in, duration(minutes))
        time.text = Formatters.slotTime(next.startTime, next.endTime)
        who.text = viewModel.names.value[next.nic] ?: next.nic
        meta.text = getString(R.string.res_next_meta, Formatters.dayChip(next.reservationDate), Formatters.kwh(next.energyKwh))
        card.isClickable = true
        card.setOnClickListener {
            findNavController().navigate(R.id.action_operatorHome_to_operatorReview, ReservationArgs.idBundle(next.id))
        }
        card.contentDescription = "${getString(R.string.res_next_transfer)}: ${time.text}, ${who.text}, ${countdown.text}"
    }

    private fun duration(minutes: Long): String = when {
        minutes < 60 -> getString(R.string.res_duration_minutes, minutes.toInt())
        minutes < 24 * 60 -> getString(R.string.res_duration_hours, (minutes / 60).toInt(), (minutes % 60).toInt())
        else -> (minutes / (24 * 60)).toInt().let { resources.getQuantityString(R.plurals.res_duration_days, it, it) }
    }

    /** Switches tab through the navigation bar so its highlight and back stack stay in sync. */
    private fun selectTab(itemId: Int) {
        requireActivity().findViewById<BottomNavigationView>(R.id.bottomNav)?.selectedItemId = itemId
    }

    private fun color(@androidx.annotation.ColorRes id: Int) = ContextCompat.getColor(requireContext(), id)

    private companion object {
        const val QUEUE_PREVIEW = 3
    }

    override fun onResume() {
        super.onResume()
        // Coming back from a decision: the queue has changed.
        viewModel.refresh()
    }
}
