package com.solargridx.mobile.shell

import android.view.View
import android.view.animation.AnimationUtils
import androidx.core.view.isVisible
import androidx.navigation.NavController
import androidx.navigation.NavDestination
import androidx.navigation.NavOptions
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.solargridx.mobile.R
import com.solargridx.mobile.session.SessionManager

/**
 * Role-aware Material 3 navigation bar (FRONTEND-OWNERSHIP §5):
 *   Prosumer: Home · Stations · Bookings · Profile
 *   Operator: Home · Reservations · Scan · Profile
 *
 * Shown only on top-level screens; hidden in auth and inside flows (booking,
 * details, summary) so those screens get the whole height. Tabs keep their
 * own back stacks (save / restore state) and switch with a fade-through.
 */
class BottomNavController(
    private val bar: BottomNavigationView,
    private val content: View,
    private val navController: NavController,
    private val session: SessionManager
) {
    private var currentRole: String? = null
    /** True while the controller itself updates the bar, so those changes don't navigate. */
    private var syncing = false
    private var bottomInset = 0

    /** System gesture / button bar height; padded onto the bar, or onto content when the bar is hidden. */
    fun onBottomInset(inset: Int) {
        bottomInset = inset
        applyInsets()
    }

    private fun applyInsets() {
        bar.setPadding(bar.paddingLeft, bar.paddingTop, bar.paddingRight, bottomInset)
        content.setPadding(content.paddingLeft, content.paddingTop, content.paddingRight, if (bar.isVisible) 0 else bottomInset)
    }

    /** Destinations that show the bar, mapped to the menu item they belong to. */
    private val topLevel = mapOf(
        R.id.prosumerHomeFragment to R.id.prosumerHomeFragment,
        R.id.operatorHomeFragment to R.id.operatorHomeFragment,
        R.id.myBookingsFragment to R.id.myBookingsFragment,
        R.id.stationsHomeFragment to R.id.stations_nav,
        R.id.qrScanFragment to R.id.scan_nav,
        R.id.identityHomeFragment to R.id.identity_nav
    )

    fun attach() {
        bar.setOnItemSelectedListener { item ->
            if (!syncing) navigateToTab(item.itemId)
            true
        }
        bar.setOnItemReselectedListener { item -> navController.popBackStack(item.itemId, false) }
        navController.addOnDestinationChangedListener { _, destination, _ -> onDestination(destination) }
    }

    private fun onDestination(destination: NavDestination) {
        val tab = topLevel[destination.id]
        if (tab == null) {
            setBarVisible(false)
            return
        }
        syncing = true
        try {
            ensureMenuForRole()
            if (bar.selectedItemId != tab) bar.selectedItemId = tab
        } finally {
            syncing = false
        }
        setBarVisible(true)
    }

    private fun ensureMenuForRole() {
        val role = session.getRole()
        if (role == currentRole && bar.menu.size() > 0) return
        currentRole = role
        bar.menu.clear()
        bar.inflateMenu(if (role == "GridOperator") R.menu.menu_nav_operator else R.menu.menu_nav_prosumer)
    }

    private fun homeId() =
        if (session.getRole() == "GridOperator") R.id.operatorHomeFragment else R.id.prosumerHomeFragment

    private fun navigateToTab(itemId: Int) {
        if (navController.currentDestination?.let { topLevel[it.id] } == itemId) return
        // Tabs live in different nested graphs (reservations, M3's stations, M2's identity),
        // so always return to Home first; every tab is reachable from there.
        navController.popBackStack(homeId(), false)
        if (itemId == homeId()) return
        val options = NavOptions.Builder()
            .setLaunchSingleTop(true)
            .setEnterAnim(R.anim.res_fade_through_in)
            .setExitAnim(R.anim.res_fade_through_out)
            .setPopEnterAnim(R.anim.res_fade_through_in)
            .setPopExitAnim(R.anim.res_fade_through_out)
            .build()
        navController.navigate(itemId, null, options)
    }

    /** Unread notifications as a badge on the Profile tab (the inbox lives there). */
    fun setUnread(count: Int) {
        if (bar.menu.findItem(R.id.identity_nav) == null) return
        if (count > 0) {
            bar.getOrCreateBadge(R.id.identity_nav).apply {
                isVisible = true
                number = count
                maxCharacterCount = 3
            }
        } else {
            bar.removeBadge(R.id.identity_nav)
        }
    }

    /** Slides the bar in / out instead of popping, so screen changes feel continuous. */
    private fun setBarVisible(visible: Boolean) {
        if (bar.isVisible == visible) return
        bar.isVisible = visible
        if (visible) bar.startAnimation(AnimationUtils.loadAnimation(bar.context, R.anim.res_nav_bar_in))
        applyInsets()
    }
}
