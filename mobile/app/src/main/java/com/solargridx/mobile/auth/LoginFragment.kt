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
import androidx.navigation.fragment.findNavController
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.AuthApi
import com.solargridx.mobile.dto.LoginRequest
import com.solargridx.mobile.session.SessionManager
import kotlinx.coroutines.launch

class LoginFragment : Fragment(R.layout.fragment_login) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val authApi = ApiClient.retrofit.create(AuthApi::class.java)
        val sessionManager = SessionManager(requireContext())

        val emailInput = view.findViewById<EditText>(R.id.emailInput)
        val passwordInput = view.findViewById<EditText>(R.id.passwordInput)
        val loginButton = view.findViewById<Button>(R.id.loginButton)
        val loginProgress = view.findViewById<ProgressBar>(R.id.loginProgress)
        val registerLink = view.findViewById<TextView>(R.id.registerLink)

        // Navigate to registration
        registerLink.setOnClickListener {
            findNavController().navigate(R.id.action_loginFragment_to_registerFragment)
        }

        view.findViewById<TextView>(R.id.forgotPasswordLink).setOnClickListener {
            findNavController().navigate(R.id.action_loginFragment_to_forgotPasswordFragment)
        }

        loginButton.setOnClickListener {
            val email = emailInput.text.toString().trim()
            val password = passwordInput.text.toString()

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(
                    requireContext(),
                    getString(R.string.error_empty_credentials),
                    Toast.LENGTH_SHORT
                ).show()
                return@setOnClickListener
            }

            // Hide keyboard
            val imm = requireContext().getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.hideSoftInputFromWindow(view.windowToken, 0)

            loginProgress.visibility = View.VISIBLE
            loginButton.isEnabled = false

            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val response = authApi.login(LoginRequest(email, password))
                    val body = response.body()

                    if (response.isSuccessful && body != null) {
                        sessionManager.saveSession(
                            token = body.token,
                            role = body.role,
                            nic = body.nic,
                            displayName = body.displayName,
                            homeRoute = body.homeRoute,
                            mustChangePassword = body.mustChangePassword,
                            status = body.status
                        )
                        Toast.makeText(
                            requireContext(),
                            "Welcome back, ${body.displayName}!",
                            Toast.LENGTH_SHORT
                        ).show()
                        if (body.mustChangePassword) {
                            findNavController().navigate(R.id.action_loginFragment_to_changePasswordFragment)
                        } else if (!AuthNavigator.goHome(findNavController(), body.role, body.status)) {
                            sessionManager.clear()
                            Toast.makeText(
                                requireContext(),
                                getString(R.string.error_role_not_supported),
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    } else {
                        val errorJson = response.errorBody()?.string()
                        val msg = try {
                            val obj = org.json.JSONObject(errorJson ?: "")
                            val parsed = obj.optString("message")
                            if (!parsed.isNullOrBlank()) parsed else "Invalid email or password. Please verify your credentials."
                        } catch (e: Exception) {
                            "Invalid email or password. Please verify your credentials."
                        }
                        Toast.makeText(
                            requireContext(),
                            msg,
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
                    loginProgress.visibility = View.GONE
                    loginButton.isEnabled = true
                }
            }
        }
    }
}
