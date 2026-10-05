package com.solargridx.mobile.shell

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Unread notification count, shared by the inbox (which knows it exactly) and the
 * Profile tab badge in the navigation bar.
 */
object InboxBadge {
    private val _unread = MutableStateFlow(0)
    val unread: StateFlow<Int> = _unread.asStateFlow()

    fun set(count: Int) {
        _unread.value = count.coerceAtLeast(0)
    }
}
