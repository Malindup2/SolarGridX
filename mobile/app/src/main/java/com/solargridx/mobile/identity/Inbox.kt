package com.solargridx.mobile.identity

import com.solargridx.mobile.dto.NotificationItem

/** The inbox filter pills. */
enum class InboxFilter { ALL, UNREAD, HIGH }

/** Where tapping a notification goes in the app. */
sealed interface InboxTarget {
    data class Reservation(val id: String) : InboxTarget
    data class Station(val id: String) : InboxTarget
    data object Profile : InboxTarget
    data object None : InboxTarget
}

/** Pure inbox logic (filtering, routing, badge text), kept free of Android types so it can be unit tested. */
object Inbox {

    fun filter(items: List<NotificationItem>, filter: InboxFilter): List<NotificationItem> = when (filter) {
        InboxFilter.ALL -> items
        InboxFilter.UNREAD -> items.filter { it.readAt == null }
        InboxFilter.HIGH -> items.filter { it.priority == "High" }
    }

    fun targetOf(item: NotificationItem): InboxTarget {
        val id = item.resourceId
        return when (item.action) {
            "Reservation" -> if (id != null) InboxTarget.Reservation(id) else InboxTarget.None
            "Station" -> if (id != null) InboxTarget.Station(id) else InboxTarget.None
            "Profile" -> InboxTarget.Profile
            // User / Prosumer management lives on the web console.
            else -> InboxTarget.None
        }
    }

    /** The list with one item marked read (optimistic update before the API call). */
    fun markedRead(items: List<NotificationItem>, id: String, now: String): List<NotificationItem> =
        items.map { if (it.id == id && it.readAt == null) it.copy(readAt = now) else it }
}
