package com.solargridx.mobile.auth

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
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
        val loginError = view.findViewById<TextView>(R.id.loginError)

        view.findViewById<Button>(R.id.loginButton).setOnClickListener {
            val email = emailInput.text.toString()
            val password = passwordInput.text.toString()

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
                            homeRoute = body.homeRoute
                        )
                        findNavController().navigate(R.id.reservations_nav)
                    } else {
                        loginError.text = "Login failed — check your credentials"
                    }
                } catch (e: Exception) {
                    loginError.text = "Could not reach the server: ${e.message}"
                }
            }
        }
    }
}
