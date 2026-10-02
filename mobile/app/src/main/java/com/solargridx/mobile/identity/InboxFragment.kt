package com.solargridx.mobile.identity

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.chip.ChipGroup
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ActivityApi
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.common.safeNoContentCall
import com.solargridx.mobile.dto.NotificationItem
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.setupBackToolbar
import com.solargridx.mobile.session.SessionManager
import com.solargridx.mobile.shell.InboxBadge
import com.solargridx.mobile.stations.StationsHomeFragment
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * The signed-in user's notifications (booking decisions, account changes, completed
 * transfers). Tapping one marks it read and opens what it is about.
 */
class InboxFragment : Fragment(R.layout.fragment_inbox) {

    private val api by lazy { ApiClient.retrofit.create(ActivityApi::class.java) }
    private var items: List<NotificationItem> = emptyList()
    private var filter = InboxFilter.ALL
    private lateinit var adapter: NotificationAdapter
    private lateinit var states: StateViews

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupBackToolbar(view, getString(R.string.inbox_title))
        states = StateViews(view) { load() }
        adapter = NotificationAdapter(::open)
        view.findViewById<RecyclerView>(R.id.inboxList).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@InboxFragment.adapter
        }

        view.findViewById<ChipGroup>(R.id.filterChips).setOnCheckedStateChangeListener { _, ids ->
            filter = when (ids.firstOrNull()) {
                R.id.chipUnread -> InboxFilter.UNREAD
                R.id.chipHigh -> InboxFilter.HIGH
                else -> InboxFilter.ALL
            }
            render()
        }

        view.findViewById<MaterialToolbar>(R.id.toolbar).setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.actionRefresh -> { load(); true }
                R.id.actionMarkAll -> { markAllRead(); true }
                else -> false
            }
        }

        load()
    }

    private fun load() {
        states.showLoading()
        viewLifecycleOwner.lifecycleScope.launch {
            when (val result = safeApiCall { api.inbox() }) {
                is ApiResult.Failure -> states.showError(result.error)
                is ApiResult.Success -> {
                    items = result.data.items
                    InboxBadge.set(result.data.unreadCount)
                    render()
                }
            }
        }
    }

    private fun render() {
        val shown = Inbox.filter(items, filter)
        adapter.submit(shown)
        if (shown.isEmpty()) states.showEmpty(getString(R.string.inbox_empty_title), getString(R.string.inbox_empty_body))
        else states.hide()
    }

    private fun now(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date())

    private fun open(item: NotificationItem) {
        if (item.readAt == null) {
            items = Inbox.markedRead(items, item.id, now())
            InboxBadge.set(items.count { it.readAt == null })
            render()
            viewLifecycleOwner.lifecycleScope.launch { safeNoContentCall { api.markRead(item.id) } }
        }

        val isOperator = SessionManager(requireContext()).getRole() == "GridOperator"
        when (val target = Inbox.targetOf(item)) {
            is InboxTarget.Reservation -> findNavController().navigate(
                if (isOperator) R.id.operatorReviewFragment else R.id.bookingDetailsFragment,
                ReservationArgs.idBundle(target.id)
            )
            is InboxTarget.Station -> findNavController().navigate(
                if (isOperator) R.id.operatorSlotsFragment else R.id.stationDetailFragment,
                if (isOperator) bundleOf(ReservationArgs.STATION_ID to target.id) else bundleOf(StationsHomeFragment.ARG_STATION_ID to target.id)
            )
            InboxTarget.Profile -> findNavController().navigateUp()
            InboxTarget.None -> Unit
        }
    }

    private fun markAllRead() {
        val now = now()
        items = items.map { if (it.readAt == null) it.copy(readAt = now) else it }
        InboxBadge.set(0)
        render()
        viewLifecycleOwner.lifecycleScope.launch {
            if (safeNoContentCall { api.markAllRead() } is ApiResult.Failure) load()
        }
    }
}

private class NotificationAdapter(private val onOpen: (NotificationItem) -> Unit) :
    RecyclerView.Adapter<NotificationAdapter.Holder>() {

    private var items: List<NotificationItem> = emptyList()

    fun submit(list: List<NotificationItem>) {
        items = list
        @Suppress("NotifyDataSetChanged") // at most 100 items, replaced on every filter change
        notifyDataSetChanged()
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val dot: View = view.findViewById(R.id.priorityDot)
        val message: TextView = view.findViewById(R.id.notificationMessage)
        val meta: TextView = view.findViewById(R.id.notificationMeta)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_notification, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val item = items[position]
        val context = holder.itemView.context
        val unread = item.readAt == null
        holder.message.text = item.message
        holder.message.setTypeface(null, if (unread) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
        holder.meta.text = "${item.category} · ${Formatters.dateTime(item.createdAt)}"
        holder.dot.backgroundTintList = ContextCompat.getColorStateList(
            context,
            when (item.priority) {
                "High" -> R.color.status_rejected
                "Medium" -> R.color.status_pending
                else -> R.color.status_completed
            }
        )
        holder.itemView.contentDescription = context.getString(
            R.string.inbox_item_cd, item.message,
            if (unread) context.getString(R.string.inbox_item_unread) else Formatters.dateTime(item.createdAt)
        )
        holder.itemView.setOnClickListener { onOpen(item) }
    }
}
