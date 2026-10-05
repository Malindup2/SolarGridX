package com.solargridx.mobile.identity

import com.solargridx.mobile.dto.NotificationItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class InboxTest {

    private fun item(id: String, priority: String = "Low", read: Boolean = false, action: String = "Reservation", resourceId: String? = "r1") =
        NotificationItem(id, "Reservation", priority, "Message $id", action, resourceId, "2026-10-02T08:00:00Z", if (read) "2026-10-02T09:00:00Z" else null)

    private val items = listOf(
        item("a", priority = "High"),
        item("b", read = true),
        item("c", priority = "Medium")
    )

    @Test
    fun filters() {
        assertEquals(listOf("a", "b", "c"), Inbox.filter(items, InboxFilter.ALL).map { it.id })
        assertEquals(listOf("a", "c"), Inbox.filter(items, InboxFilter.UNREAD).map { it.id })
        assertEquals(listOf("a"), Inbox.filter(items, InboxFilter.HIGH).map { it.id })
    }

    @Test
    fun targets() {
        assertEquals(InboxTarget.Reservation("r1"), Inbox.targetOf(item("x")))
        assertEquals(InboxTarget.Station("s1"), Inbox.targetOf(item("x", action = "Station", resourceId = "s1")))
        assertEquals(InboxTarget.Profile, Inbox.targetOf(item("x", action = "Profile", resourceId = null)))
        assertEquals(InboxTarget.None, Inbox.targetOf(item("x", action = "Reservation", resourceId = null)))
        // Account management is on the web console.
        assertEquals(InboxTarget.None, Inbox.targetOf(item("x", action = "Prosumer")))
    }

    @Test
    fun markedRead_onlyTouchesTheUnreadItem() {
        val after = Inbox.markedRead(items, "a", "NOW")

        assertEquals("NOW", after.first { it.id == "a" }.readAt)
        assertEquals("2026-10-02T09:00:00Z", after.first { it.id == "b" }.readAt)
        assertNull(after.first { it.id == "c" }.readAt)
    }

    @Test
    fun avatarChecks() {
        assertNull(AvatarPhoto.problem("image/jpeg", 1024))
        assertNull(AvatarPhoto.problem("image/png", AvatarPhoto.MAX_BYTES.toLong()))
        assertEquals(AvatarPhoto.Problem.TOO_LARGE, AvatarPhoto.problem("image/png", AvatarPhoto.MAX_BYTES + 1L))
        assertEquals(AvatarPhoto.Problem.WRONG_TYPE, AvatarPhoto.problem("image/gif", 10))
        assertEquals(AvatarPhoto.Problem.WRONG_TYPE, AvatarPhoto.problem(null, 10))
        assertEquals(AvatarPhoto.Problem.EMPTY, AvatarPhoto.problem("image/jpeg", 0))
        assertEquals("avatar.png", AvatarPhoto.fileName("image/png"))
        assertEquals("avatar.jpg", AvatarPhoto.fileName("image/jpeg"))
    }
}
