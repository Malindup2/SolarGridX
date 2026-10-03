package com.solargridx.mobile.shell

import androidx.core.view.doOnLayout
import androidx.fragment.app.Fragment
import androidx.navigation.NavOptions
import androidx.navigation.fragment.findNavController
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.badge.BadgeDrawable
import com.google.android.material.badge.BadgeUtils
import com.google.android.material.badge.ExperimentalBadgeUtils
import com.solargridx.mobile.R
import com.solargridx.mobile.reservations.ui.collectWhileStarted

object NotificationBell {

    @androidx.annotation.OptIn(ExperimentalBadgeUtils::class)
    fun attach(fragment: Fragment, toolbar: MaterialToolbar) {
        val item = toolbar.menu.findItem(R.id.actionNotifications) ?: return
        val badge = BadgeDrawable.create(fragment.requireContext()).apply {
            maxCharacterCount = 3
            isVisible = false
        }
        toolbar.doOnLayout { BadgeUtils.attachBadgeDrawable(badge, toolbar, R.id.actionNotifications) }
        fragment.collectWhileStarted(InboxBadge.unread) { count ->
            badge.isVisible = count > 0
            if (count > 0) badge.number = count
            item.contentDescription = if (count > 0) {
                fragment.getString(R.string.inbox_bell_unread, count)
            } else {
                fragment.getString(R.string.inbox_title)
            }
        }
    }

    fun open(fragment: Fragment) {
        val options = NavOptions.Builder()
            .setEnterAnim(R.anim.res_enter)
            .setExitAnim(R.anim.res_exit)
            .setPopEnterAnim(R.anim.res_pop_enter)
            .setPopExitAnim(R.anim.res_pop_exit)
            .build()
        fragment.findNavController().navigate(R.id.inboxFragment, null, options)
    }
}
