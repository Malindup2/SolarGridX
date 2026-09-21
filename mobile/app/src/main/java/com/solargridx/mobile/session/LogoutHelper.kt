package com.solargridx.mobile.session

import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.AuthApi
import com.solargridx.mobile.auth.AuthNavigator
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

object LogoutHelper {

    fun confirmAndLogout(fragment: Fragment) {
        AlertDialog.Builder(fragment.requireContext())
            .setTitle(R.string.logout_title)
            .setMessage(R.string.logout_message)
            .setNegativeButton(R.string.btn_cancel, null)
            .setPositiveButton(R.string.btn_logout) { _, _ -> logout(fragment) }
            .show()
    }

    private fun logout(fragment: Fragment) {
        val context = fragment.requireContext().applicationContext
        val sessionManager = SessionManager(context)
        val authApi = ApiClient.retrofit.create(AuthApi::class.java)

        fragment.viewLifecycleOwner.lifecycleScope.launch {
            withTimeoutOrNull(8000) {
                try {
                    authApi.logout()
                } catch (e: Exception) {
                    // The local session is cleared even if the server cannot be reached.
                }
            }
            sessionManager.clear()
            Toast.makeText(context, R.string.logout_success, Toast.LENGTH_SHORT).show()
            AuthNavigator.goToLogin(fragment.findNavController())
        }
    }
}
