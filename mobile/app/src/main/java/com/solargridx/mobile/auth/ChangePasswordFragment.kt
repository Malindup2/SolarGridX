package com.solargridx.mobile.auth

import android.content.Context
import android.os.Bundle
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavOptions
import androidx.navigation.fragment.findNavController
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.AuthApi
import com.solargridx.mobile.dto.ChangePasswordRequest
import com.solargridx.mobile.session.LogoutHelper
import com.solargridx.mobile.session.SessionManager
import kotlinx.coroutines.launch

class ChangePasswordFragment : Fragment(R.layout.fragment_change_password) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val authApi = ApiClient.retrofit.create(AuthApi::class.java)
        val sessionManager = SessionManager(requireContext())
        val forced = sessionManager.mustChangePassword()

        val titleText = view.findViewById<TextView>(R.id.changePasswordTitle)
        val subtitleText = view.findViewById<TextView>(R.id.changePasswordSubtitle)
        val currentInput = view.findViewById<EditText>(R.id.currentPasswordInput)
        val newInput = view.findViewById<EditText>(R.id.newPasswordInput)
        val confirmInput = view.findViewById<EditText>(R.id.confirmNewPasswordInput)
        val submitButton = view.findViewById<Button>(R.id.changePasswordButton)
        val progress = view.findViewById<ProgressBar>(R.id.changePasswordProgress)
        val signOutLink = view.findViewById<TextView>(R.id.changePasswordSignOut)

        if (forced) {
            titleText.setText(R.string.change_password_title_forced)
            subtitleText.setText(R.string.change_password_subtitle_forced)
        }

        signOutLink.setOnClickListener { LogoutHelper.confirmAndLogout(this) }

        submitButton.setOnClickListener {
            val current = currentInput.text.toString()
            val newPassword = newInput.text.toString()
            val confirm = confirmInput.text.toString()

            if (current.isEmpty()) {
                Toast.makeText(requireContext(), R.string.error_current_password_empty, Toast.LENGTH_SHORT).show()
                currentInput.requestFocus()
                return@setOnClickListener
            }

            if (newPassword.length < 8) {
                Toast.makeText(requireContext(), R.string.error_password_short, Toast.LENGTH_SHORT).show()
                newInput.requestFocus()
                return@setOnClickListener
            }

            if (newPassword != confirm) {
                Toast.makeText(requireContext(), R.string.error_passwords_mismatch, Toast.LENGTH_SHORT).show()
                confirmInput.requestFocus()
                return@setOnClickListener
            }

            val imm = requireContext().getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.hideSoftInputFromWindow(view.windowToken, 0)

            progress.visibility = View.VISIBLE
            submitButton.isEnabled = false

            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val response = authApi.changePassword(ChangePasswordRequest(current, newPassword))

                    if (response.isSuccessful) {
                        sessionManager.markPasswordChanged()
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
                    } else {
                        val errorJson = response.errorBody()?.string()
                        val message = try {
                            org.json.JSONObject(errorJson ?: "").optString("message")
                        } catch (e: Exception) {
                            ""
                        }
                        Toast.makeText(
                            requireContext(),
                            message.ifBlank { getString(R.string.change_password_failed) },
                            Toast.LENGTH_LONG
                        ).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(
                        requireContext(),
                        "Unable to connect to the microgrid API server.",
                        Toast.LENGTH_LONG
                    ).show()
                } finally {
                    progress.visibility = View.GONE
                    submitButton.isEnabled = true
                }
            }
        }
    }
}
