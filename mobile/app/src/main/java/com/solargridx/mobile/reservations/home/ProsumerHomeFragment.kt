package com.solargridx.mobile.reservations.home

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.ColorRes
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.button.MaterialButton
import com.solargridx.mobile.R
import com.solargridx.mobile.common.ApiError
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.StatusStyle
import com.solargridx.mobile.reservations.ui.bindReservationCard
import com.solargridx.mobile.reservations.ui.bindStat
import com.solargridx.mobile.reservations.ui.charts.BarChartView
import com.solargridx.mobile.reservations.ui.charts.DonutChartView
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.reservations.ui.staggerChildrenIn
import com.solargridx.mobile.session.SessionManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Prosumer home dashboard: next booking with an upcoming-energy ring, counts,
 * a book button, energy this week (bars), status breakdown (donut) and the
 * latest bookings. Data: GET /dashboard/prosumer/{nic} + GET /reservations.
 */
class ProsumerHomeFragment : Fragment(R.layout.fragment_prosumer_home) {

    private val viewModel: ProsumerHomeViewModel by viewModels()
    private var chartsAnimated = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val session = SessionManager(requireContext())
        val nic = session.getNic()
        val firstName = session.getDisplayName()?.substringBefore(' ').orEmpty()

        view.findViewById<TextView>(R.id.greeting).text = getString(R.string.res_greeting, firstName)
        view.findViewById<TextView>(R.id.today).text = SimpleDateFormat("EEEE, d MMMM", Locale.getDefault()).format(Date())

        val states = StateViews(view) { nic?.let { viewModel.load(it) } }
        val content = view.findViewById<View>(R.id.content)
        val banner = view.findViewById<View>(R.id.pendingBanner)

        view.findViewById<MaterialToolbar>(R.id.toolbar).setOnMenuItemClickListener { item ->
            if (item.itemId == R.id.actionRefresh) { nic?.let { viewModel.load(it) }; true } else false
        }

        view.findViewById<View>(R.id.bookButton).setOnClickListener { startBooking() }
        view.findViewById<View>(R.id.seeAll).setOnClickListener { selectTab(R.id.myBookingsFragment) }

        if (nic == null) {
            states.showError(ApiError(ApiError.UNKNOWN_ERROR, getString(R.string.res_not_signed_in)))
            return
        }

        collectWhileStarted(viewModel.state) { state ->
            when (state) {
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
                    banner.isVisible = data.accountStatus == "Pending"
                    // Charts animate once per screen visit, not on every quiet refresh.
                    val animate = !chartsAnimated
                    bindHero(view, data.nextBooking, data.reservations, animate)
                    bindCounts(view, data)
                    bindWeekChart(view, data.reservations, animate)
                    bindStatusDonut(view, data.reservations, animate)
                    bindRecent(view, data.reservations)
                    chartsAnimated = true
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // First show, and coming back from booking / cancelling: refresh quietly.
        SessionManager(requireContext()).getNic()?.let { viewModel.load(it) }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        chartsAnimated = false
    }

    // ---- sections ---------------------------------------------------------------------------

    private fun bindHero(view: View, booking: ReservationResponse?, all: List<ReservationResponse>, animate: Boolean) {
        val card = view.findViewById<View>(R.id.heroCard)
        val label = view.findViewById<TextView>(R.id.heroLabel)
        val status = view.findViewById<TextView>(R.id.heroStatus)
        val title = view.findViewById<TextView>(R.id.heroTitle)
        val body = view.findViewById<TextView>(R.id.heroBody)
        val action = view.findViewById<MaterialButton>(R.id.heroAction)

        // Ring: upcoming energy, approved (solid) vs pending (soft), total in the centre.
        val approved = HomeInsights.upcomingKwh(all, "Approved")
        val pending = HomeInsights.upcomingKwh(all, "Pending")
        view.findViewById<DonutChartView>(R.id.heroRing).apply {
            trackColor = color(R.color.res_on_primary_container)
            centerValueColor = color(R.color.white)
            centerCaptionColor = color(R.color.res_on_primary_muted)
            strokeWidthPx = resources.displayMetrics.density * 10
            setData(
                listOf(
                    DonutChartView.Segment(approved.toFloat(), color(R.color.white)),
                    DonutChartView.Segment(pending.toFloat(), color(R.color.res_on_primary_muted))
                ),
                centerValue = Formatters.kwh(approved + pending).removeSuffix(" kWh"),
                centerCaption = getString(R.string.res_ring_caption),
                animate = animate
            )
        }

        if (booking == null) {
            label.setText(R.string.res_book_energy)
            status.isVisible = false
            title.setText(R.string.res_ready_title)
            body.setText(R.string.res_ready_body)
            action.setText(R.string.res_book_energy)
            action.setOnClickListener { startBooking() }
            card.setOnClickListener { startBooking() }
            card.contentDescription = "${title.text}. ${body.text}"
            return
        }

        val openDetails = {
            findNavController().navigate(R.id.action_prosumerHome_to_bookingDetails, ReservationArgs.idBundle(booking.id))
        }
        label.setText(R.string.res_next_booking)
        status.isVisible = true
        status.setText(StatusStyle.of(booking.status).label)
        title.text = Formatters.slotTime(booking.startTime, booking.endTime)
        body.text = getString(R.string.res_when, booking.stationName, Formatters.dayChip(booking.reservationDate))
        action.setText(R.string.res_view_details)
        action.setOnClickListener { openDetails() }
        card.setOnClickListener { openDetails() }
        card.contentDescription = "${label.text}: ${title.text}, ${body.text}, ${status.text}"
    }

    private fun bindCounts(view: View, data: ProsumerHome) {
        view.bindStat(R.id.statActive, data.dashboard.activeCount.toString(), getString(R.string.res_stat_active), StatusStyle.APPROVED, R.drawable.ic_res_bolt)
        view.bindStat(R.id.statPending, data.dashboard.pendingCount.toString(), getString(R.string.res_stat_pending), StatusStyle.PENDING, R.drawable.ic_res_hourglass)
        view.bindStat(R.id.statUpcoming, data.dashboard.approvedFutureCount.toString(), getString(R.string.res_stat_upcoming), StatusStyle.COMPLETED, R.drawable.ic_res_calendar)
    }

    private fun bindWeekChart(view: View, items: List<ReservationResponse>, animate: Boolean) {
        val days = HomeInsights.nextSevenDays(items)
        val total = days.sumOf { it.kwh }
        view.findViewById<TextView>(R.id.weekTotal).text = getString(R.string.res_chart_week_total, Formatters.kwh(total))
        view.findViewById<BarChartView>(R.id.weekChart).setData(
            days.map { BarChartView.Bar(it.label, it.kwh.toFloat(), Formatters.kwh(it.kwh).removeSuffix(" kWh")) },
            highlightIndex = 0, // today
            animate = animate
        )
    }

    private fun bindStatusDonut(view: View, items: List<ReservationResponse>, animate: Boolean) {
        val counts = HomeInsights.statusCounts(items)
        view.findViewById<DonutChartView>(R.id.statusDonut).setData(
            counts.map { (status, count) -> DonutChartView.Segment(count.toFloat(), color(StatusStyle.of(status).color)) },
            centerValue = items.size.toString(),
            centerCaption = getString(R.string.nav_bookings).lowercase(Locale.getDefault()),
            animate = animate
        )
        val legend = view.findViewById<LinearLayout>(R.id.statusLegend)
        legend.removeAllViews()
        counts.forEach { (status, count) ->
            val row = layoutInflater.inflate(R.layout.item_legend, legend, false)
            val style = StatusStyle.of(status)
            row.findViewById<View>(R.id.legendDot).backgroundTintList = ContextCompat.getColorStateList(requireContext(), style.color)
            row.findViewById<TextView>(R.id.legendLabel).setText(style.label)
            row.findViewById<TextView>(R.id.legendValue).text = count.toString()
            row.contentDescription = "${getString(style.label)}: $count"
            legend.addView(row)
        }
    }

    private fun bindRecent(view: View, items: List<ReservationResponse>) {
        val list = view.findViewById<LinearLayout>(R.id.recentList)
        list.removeAllViews()
        val recent = HomeInsights.recent(items)
        view.findViewById<View>(R.id.recentEmpty).isVisible = recent.isEmpty()
        view.findViewById<View>(R.id.seeAll).isVisible = recent.isNotEmpty()
        recent.forEach { reservation ->
            val card = layoutInflater.inflate(R.layout.item_reservation, list, false)
            card.bindReservationCard(reservation) {
                findNavController().navigate(R.id.action_prosumerHome_to_bookingDetails, ReservationArgs.idBundle(reservation.id))
            }
            list.addView(card)
        }
    }

    // ---- navigation -------------------------------------------------------------------------

    /** Booking starts at slot selection (temporary picker until M4's screen is merged). */
    private fun startBooking() {
        findNavController().navigate(
            R.id.action_prosumerHome_to_slotPicker,
            bundleOf(ReservationArgs.PICKER_MODE to ReservationArgs.MODE_BOOK)
        )
    }

    /** Switches tab through the navigation bar so its highlight and back stack stay in sync. */
    private fun selectTab(itemId: Int) {
        requireActivity().findViewById<BottomNavigationView>(R.id.bottomNav)?.selectedItemId = itemId
    }

    private fun color(@ColorRes id: Int) = ContextCompat.getColor(requireContext(), id)
}
