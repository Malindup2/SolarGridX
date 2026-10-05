package com.solargridx.mobile.auth

import android.os.Bundle
import android.util.Patterns
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.AuthApi
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.displayText
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.dto.ForgotPasswordRequest
import com.solargridx.mobile.reservations.ui.setupBackToolbar
import kotlinx.coroutines.launch

/**
 * Requests a password reset email (POST /auth/forgot-password). The API answers the
 * same way whether or not the email has an account, so this screen does too. The link
 * opens the web reset page; afterwards the user signs in here with the new password.
 */
class ForgotPasswordFragment : Fragment(R.layout.fragment_forgot_password) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupBackToolbar(view, "")

        val title = view.findViewById<TextView>(R.id.forgotTitle)
        val subtitle = view.findViewById<TextView>(R.id.forgotSubtitle)
        val emailLayout = view.findViewById<TextInputLayout>(R.id.emailLayout)
        val emailInput = view.findViewById<TextInputEditText>(R.id.emailInput)
        val send = view.findViewById<MaterialButton>(R.id.sendButton)
        val progress = view.findViewById<ProgressBar>(R.id.progress)
        view.findViewById<MaterialButton>(R.id.backButton).setOnClickListener { findNavController().navigateUp() }

        val authApi = ApiClient.retrofit.create(AuthApi::class.java)

        fun setBusy(busy: Boolean) {
            send.isEnabled = !busy
            emailLayout.isEnabled = !busy
            progress.isVisible = busy
        }

        fun submit() {
            val email = emailInput.text?.toString()?.trim().orEmpty()
            if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                emailLayout.error = getString(R.string.error_invalid_email)
                emailInput.requestFocus()
                return
            }
            emailLayout.error = null
            setBusy(true)

            viewLifecycleOwner.lifecycleScope.launch {
                when (val result = safeApiCall { authApi.forgotPassword(ForgotPasswordRequest(email)) }) {
                    is ApiResult.Success -> {
                        title.text = getString(R.string.forgot_password_sent_title)
                        subtitle.text = result.data.message + "\n\n" + getString(R.string.forgot_password_sent_body)
                        emailLayout.isVisible = false
                        send.isVisible = false
                        progress.isVisible = false
                        title.announceForAccessibility(title.text)
                    }
                    is ApiResult.Failure -> {
                        setBusy(false)
                        emailLayout.error = result.error.displayText()
                    }
                }
            }
        }

        send.setOnClickListener { submit() }
        emailInput.setOnEditorActionListener { _, _, _ -> submit(); true }
    }
}
