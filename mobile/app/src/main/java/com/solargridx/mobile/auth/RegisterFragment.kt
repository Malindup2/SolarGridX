package com.solargridx.mobile.auth

import android.content.Context
import android.os.Bundle
import android.util.Patterns
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.AuthApi
import com.solargridx.mobile.dto.RegisterRequest
import kotlinx.coroutines.launch

class RegisterFragment : Fragment(R.layout.fragment_register) {

    private val nicPattern = Regex("^([0-9]{9}[vVxX]|[0-9]{12})$")

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val authApi = ApiClient.retrofit.create(AuthApi::class.java)

        val btnBackToLogin = view.findViewById<ImageButton>(R.id.btnBackToLogin)
        val loginLink = view.findViewById<TextView>(R.id.loginLink)
        val registerButton = view.findViewById<Button>(R.id.registerButton)
        val registerProgress = view.findViewById<ProgressBar>(R.id.registerProgress)

        val nicInput = view.findViewById<EditText>(R.id.nicInput)
        val fullNameInput = view.findViewById<EditText>(R.id.fullNameInput)
        val emailInput = view.findViewById<EditText>(R.id.regEmailInput)
        val phoneInput = view.findViewById<EditText>(R.id.phoneInput)
        val addressInput = view.findViewById<EditText>(R.id.addressInput)
        val passwordInput = view.findViewById<EditText>(R.id.regPasswordInput)
        val confirmPasswordInput = view.findViewById<EditText>(R.id.regConfirmPasswordInput)

        val navigateBack = {
            if (!findNavController().popBackStack()) {
                findNavController().navigate(R.id.action_registerFragment_to_loginFragment)
            }
        }

        btnBackToLogin.setOnClickListener { navigateBack() }
        loginLink.setOnClickListener { navigateBack() }

        registerButton.setOnClickListener {
            val nic = nicInput.text.toString().trim().uppercase()
            val fullName = fullNameInput.text.toString().trim()
            val email = emailInput.text.toString().trim()
            val phone = phoneInput.text.toString().trim()
            val address = addressInput.text.toString().trim()
            val password = passwordInput.text.toString()
            val confirmPassword = confirmPasswordInput.text.toString()

            // Validations
            if (!nicPattern.matches(nic)) {
                Toast.makeText(requireContext(), getString(R.string.error_invalid_nic), Toast.LENGTH_SHORT).show()
                nicInput.requestFocus()
                return@setOnClickListener
            }

            if (fullName.isEmpty()) {
                Toast.makeText(requireContext(), getString(R.string.error_empty_name), Toast.LENGTH_SHORT).show()
                fullNameInput.requestFocus()
                return@setOnClickListener
            }

            if (email.isEmpty() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                Toast.makeText(requireContext(), getString(R.string.error_invalid_email), Toast.LENGTH_SHORT).show()
                emailInput.requestFocus()
                return@setOnClickListener
            }

            if (password.length < 8) {
                Toast.makeText(requireContext(), getString(R.string.error_password_short), Toast.LENGTH_SHORT).show()
                passwordInput.requestFocus()
                return@setOnClickListener
            }

            if (password != confirmPassword) {
                Toast.makeText(requireContext(), getString(R.string.error_passwords_mismatch), Toast.LENGTH_SHORT).show()
                confirmPasswordInput.requestFocus()
                return@setOnClickListener
            }

            // Hide keyboard
            val imm = requireContext().getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.hideSoftInputFromWindow(view.windowToken, 0)

            registerProgress.visibility = View.VISIBLE
            registerButton.isEnabled = false

            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val request = RegisterRequest(
                        nic = nic,
                        fullName = fullName,
                        email = email,
                        phone = phone.ifBlank { null },
                        address = address.ifBlank { null },
                        password = password
                    )

                    val response = authApi.register(request)

                    if (response.isSuccessful || response.code() == 201) {
                        Toast.makeText(
                            requireContext(),
                            getString(R.string.registration_success),
                            Toast.LENGTH_LONG
                        ).show()
                        navigateBack()
                    } else {
                        val errorJson = response.errorBody()?.string()
                        val msg = try {
                            val obj = org.json.JSONObject(errorJson ?: "")
                            val parsed = obj.optString("message")
                            if (!parsed.isNullOrBlank()) parsed else if (response.code() == 409) {
                                "This NIC or Email is already registered. Please sign in."
                            } else {
                                "Registration failed. Please check your details and try again."
                            }
                        } catch (e: Exception) {
                            if (response.code() == 409) {
                                "This NIC or Email is already registered. Please sign in."
                            } else {
                                "Registration failed. Please check your details and try again."
                            }
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
                    registerProgress.visibility = View.GONE
                    registerButton.isEnabled = true
                }
            }
        }
    }
}
