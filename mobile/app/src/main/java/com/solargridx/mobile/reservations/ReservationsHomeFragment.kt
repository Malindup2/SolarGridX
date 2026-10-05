package com.solargridx.mobile.reservations

import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.navigation.NavOptions
import androidx.navigation.fragment.findNavController
import com.solargridx.mobile.R
import com.solargridx.mobile.session.SessionManager

/**
 * Start of the reservation graph (AuthNavigator lands here after login).
 * Sends each role to its own home.
 */
class ReservationsHomeFragment : Fragment(R.layout.fragment_res_router) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val destination = when (SessionManager(requireContext()).getRole()) {
            "GridOperator" -> R.id.operatorHomeFragment
            else -> R.id.prosumerHomeFragment
        }
        val options = NavOptions.Builder().setPopUpTo(R.id.reservationsHomeFragment, true).build()
        findNavController().navigate(destination, null, options)
    }
}
