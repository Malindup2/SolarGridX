package com.solargridx.mobile.auth

import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.android.material.button.MaterialButton
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.ProsumerApi
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.displayText
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.session.LogoutHelper
import com.solargridx.mobile.session.SessionManager
import kotlinx.coroutines.launch

/**
 * A prosumer who registered but hasn't been activated yet can sign in, but can't book
 * (BR-10), so they wait here. "Check again" re-reads the account; once the Backoffice
 * activates it, they continue to their home screen.
 */
class PendingAccountFragment : Fragment(R.layout.fragment_pending_account) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val session = SessionManager(requireContext())
        val message = view.findViewById<TextView>(R.id.pendingMessage)
        val check = view.findViewById<MaterialButton>(R.id.checkButton)

        view.findViewById<TextView>(R.id.pendingBody).text =
            getString(R.string.pending_body, session.getDisplayName().orEmpty().substringBefore(' '))
        view.findViewById<MaterialButton>(R.id.logoutButton).setOnClickListener { LogoutHelper.confirmAndLogout(this) }

        check.setOnClickListener {
            val nic = session.getNic() ?: return@setOnClickListener
            check.isEnabled = false
            viewLifecycleOwner.lifecycleScope.launch {
                val result = safeApiCall { ApiClient.retrofit.create(ProsumerApi::class.java).get(nic) }
                check.isEnabled = true
                message.isVisible = true
                when (result) {
                    is ApiResult.Failure -> message.text = result.error.displayText()
                    is ApiResult.Success -> when (result.data.status) {
                        "Active" -> {
                            session.updateStatus("Active")
                            message.text = getString(R.string.pending_now_active)
                            AuthNavigator.goHome(findNavController(), session.getRole(), "Active")
                        }
                        "Deactivated" -> message.text = getString(R.string.pending_deactivated)
                        else -> message.text = getString(R.string.pending_still_waiting)
                    }
                }
            }
        }
    }
}
