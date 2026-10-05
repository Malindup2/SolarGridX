package com.solargridx.mobile.auth

import androidx.navigation.NavController
import androidx.navigation.NavOptions
import com.solargridx.mobile.R

object AuthNavigator {

    fun homeDestination(role: String?): Int? = when (role) {
        "Prosumer", "GridOperator" -> R.id.reservations_nav
        else -> null
    }

    /**
     * Sends a signed-in user to their home. A prosumer the Backoffice hasn't activated yet
     * goes to the waiting screen instead: they can sign in, but cannot book (BR-10).
     */
    fun goHome(navController: NavController, role: String?, status: String? = null): Boolean {
        if (role == "Prosumer" && status == "Pending") {
            val options = NavOptions.Builder().setPopUpTo(R.id.auth_nav, false).build()
            navController.navigate(R.id.pendingAccountFragment, null, options)
            return true
        }
        val destination = homeDestination(role) ?: return false
        val options = NavOptions.Builder().setPopUpTo(R.id.auth_nav, true).build()
        navController.navigate(destination, null, options)
        return true
    }

    fun goToLogin(navController: NavController) {
        val options = NavOptions.Builder().setPopUpTo(R.id.nav_graph, true).build()
        navController.navigate(R.id.loginFragment, null, options)
    }
}
