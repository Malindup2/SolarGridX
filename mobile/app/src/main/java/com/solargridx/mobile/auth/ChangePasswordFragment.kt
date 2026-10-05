package com.solargridx.mobile.auth

import android.content.Context
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavOptions
import androidx.navigation.fragment.findNavController
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.AuthApi
import com.solargridx.mobile.common.ApiError
import com.solargridx.mobile.dto.ChangePasswordRequest
import com.solargridx.mobile.session.LogoutHelper
import com.solargridx.mobile.session.SessionManager
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.io.IOException

/**
 * Change password. Two entry points share this screen:
 *  - forced (first login with a temporary password): no way back, Logout is the escape;
 *  - from Profile: toolbar back arrow, no Logout (it already lives on Profile).
 * Validation errors show under the field they belong to, not as toasts.
 */
class ChangePasswordFragment : Fragment(R.layout.fragment_change_password) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val authApi = ApiClient.retrofit.create(AuthApi::class.java)
        val sessionManager = SessionManager(requireContext())
        val forced = sessionManager.mustChangePassword()

        val toolbar = view.findViewById<MaterialToolbar>(R.id.toolbar)
        val titleText = view.findViewById<TextView>(R.id.changePasswordTitle)
        val subtitleText = view.findViewById<TextView>(R.id.changePasswordSubtitle)
        val currentLayout = view.findViewById<TextInputLayout>(R.id.currentPasswordLayout)
        val newLayout = view.findViewById<TextInputLayout>(R.id.newPasswordLayout)
        val confirmLayout = view.findViewById<TextInputLayout>(R.id.confirmPasswordLayout)
        val currentInput = view.findViewById<TextInputEditText>(R.id.currentPasswordInput)
        val newInput = view.findViewById<TextInputEditText>(R.id.newPasswordInput)
        val confirmInput = view.findViewById<TextInputEditText>(R.id.confirmNewPasswordInput)
        val submitButton = view.findViewById<Button>(R.id.changePasswordButton)
        val progress = view.findViewById<ProgressBar>(R.id.changePasswordProgress)
        val signOutLink = view.findViewById<TextView>(R.id.changePasswordSignOut)

        if (forced) {
            titleText.setText(R.string.change_password_title_forced)
            subtitleText.setText(R.string.change_password_subtitle_forced)
            signOutLink.setOnClickListener { LogoutHelper.confirmAndLogout(this) }
        } else {
            // The toolbar carries the title, so the large heading would only repeat it.
            toolbar.setTitle(R.string.profile_change_password)
            toolbar.setNavigationIcon(R.drawable.ic_arrow_back)
            toolbar.setNavigationContentDescription(R.string.res_back)
            toolbar.setNavigationOnClickListener { findNavController().navigateUp() }
            titleText.isVisible = false
            signOutLink.isVisible = false
        }

        currentInput.doAfterTextChanged { currentLayout.error = null }
        newInput.doAfterTextChanged { newLayout.error = null }
        confirmInput.doAfterTextChanged { confirmLayout.error = null }

        fun setBusy(busy: Boolean) {
            progress.isVisible = busy
            submitButton.isEnabled = !busy
            listOf(currentLayout, newLayout, confirmLayout).forEach { it.isEnabled = !busy }
        }

        fun submit() {
            val current = currentInput.text?.toString().orEmpty()
            val newPassword = newInput.text?.toString().orEmpty()
            val confirm = confirmInput.text?.toString().orEmpty()

            currentLayout.error = if (current.isEmpty()) getString(R.string.error_current_password_empty) else null
            newLayout.error = if (newPassword.length < 8) getString(R.string.error_password_short) else null
            confirmLayout.error = if (newLayout.error == null && newPassword != confirm) getString(R.string.error_passwords_mismatch) else null
            val firstInvalid = listOf(currentLayout to currentInput, newLayout to newInput, confirmLayout to confirmInput)
                .firstOrNull { it.first.error != null }
            if (firstInvalid != null) {
                firstInvalid.second.requestFocus()
                return
            }

            val imm = requireContext().getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.hideSoftInputFromWindow(view.windowToken, 0)
            setBusy(true)

            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val response = authApi.changePassword(ChangePasswordRequest(current, newPassword))

                    val session = response.body()
                    if (response.isSuccessful && session != null) {
                        // The change signed out every older token, this device's included;
                        // keep the fresh session the API returned.
                        sessionManager.saveSession(
                            token = session.token,
                            role = session.role,
                            nic = session.nic,
                            displayName = session.displayName,
                            homeRoute = session.homeRoute,
                            mustChangePassword = false,
                            status = session.status
                        )
                        Toast.makeText(requireContext(), R.string.change_password_success, Toast.LENGTH_LONG).show()

                        if (forced) {
                            val options = NavOptions.Builder().setPopUpTo(R.id.auth_nav, true).build()
                            val home = AuthNavigator.homeDestination(sessionManager.getRole())
                            if (home != null) {
                                findNavController().navigate(home, null, options)
                            } else {
                                AuthNavigator.goToLogin(findNavController())
                            }
                        } else {
                            findNavController().popBackStack()
                        }
                        return@launch
                    }

                    // Re-enable first: a disabled TextInputLayout doesn't render its error text.
                    setBusy(false)
                    val error = try {
                        org.json.JSONObject(response.errorBody()?.string().orEmpty())
                    } catch (e: org.json.JSONException) {
                        null
                    }
                    val message = error?.optString("message").orEmpty()
                        .ifBlank { getString(R.string.change_password_failed) }
                    if (error?.optString("code") == "INVALID_CURRENT_PASSWORD") {
                        // Clear first: the text watcher resets the error on every change.
                        currentInput.text?.clear()
                        currentLayout.error = message
                        currentInput.requestFocus()
                    } else {
                        Snackbar.make(view, message, Snackbar.LENGTH_LONG).show()
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (e: IOException) {
                    Snackbar.make(view, ApiError.network().message, Snackbar.LENGTH_LONG).show()
                } catch (e: RuntimeException) {
                    Snackbar.make(view, R.string.change_password_failed, Snackbar.LENGTH_LONG).show()
                } finally {
                    setBusy(false)
                }
            }
        }

        submitButton.setOnClickListener { submit() }
        confirmInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) { submit(); true } else false
        }
    }
}
