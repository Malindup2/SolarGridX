package com.solargridx.mobile.reservations

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.solargridx.mobile.R
import com.solargridx.mobile.session.LogoutHelper
import com.solargridx.mobile.session.SessionManager


class ReservationsHomeFragment : Fragment(R.layout.fragment_placeholder) {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val session = SessionManager(requireContext())
        view.findViewById<TextView>(R.id.placeholderText).text =
            "Reservations — Member 1\n${session.getDisplayName()} (${session.getRole()})"

        view.findViewById<Button>(R.id.placeholderLogout).apply {
            visibility = View.VISIBLE
            setOnClickListener { LogoutHelper.confirmAndLogout(this@ReservationsHomeFragment) }
        }
    }
}
