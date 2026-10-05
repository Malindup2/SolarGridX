package com.solargridx.mobile.identity

import android.os.Bundle
import android.util.Patterns
import android.view.View
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.solargridx.mobile.R
import com.solargridx.mobile.common.ActionState
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.common.displayText
import com.solargridx.mobile.dto.UpdateProsumerRequest
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.reservations.ui.setupBackToolbar
import com.solargridx.mobile.session.SessionManager

/**
 * Edit profile: PUT /prosumers/{nic} with the whole object (fullName and email
 * required, phone / address optional). NIC and status can't be changed here.
 */
class EditProfileFragment : Fragment(R.layout.fragment_edit_profile) {

    private val viewModel: ProfileViewModel by activityViewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupBackToolbar(view, getString(R.string.profile_edit_title))
        val nic = SessionManager(requireContext()).getNic() ?: run {
            findNavController().navigateUp()
            return
        }

        val nameLayout = view.findViewById<TextInputLayout>(R.id.nameLayout)
        val emailLayout = view.findViewById<TextInputLayout>(R.id.emailLayout)
        val name = view.findViewById<TextInputEditText>(R.id.nameInput)
        val email = view.findViewById<TextInputEditText>(R.id.emailInput)
        val phone = view.findViewById<TextInputEditText>(R.id.phoneInput)
        val address = view.findViewById<TextInputEditText>(R.id.addressInput)
        val save = view.findViewById<View>(R.id.saveButton)
        val progress = view.findViewById<View>(R.id.progress)
        val errorCard = view.findViewById<View>(R.id.inlineError)
        val errorText = view.findViewById<TextView>(R.id.inlineErrorText)

        // Pre-fill once from the profile already loaded on the Profile tab.
        if (savedInstanceState == null) {
            (viewModel.profile.value as? UiState.Content)?.data?.let { p ->
                name.setText(p.fullName)
                email.setText(p.email)
                phone.setText(p.phone.orEmpty())
                address.setText(p.address.orEmpty())
            }
        }
        name.doAfterTextChanged { nameLayout.error = null }
        email.doAfterTextChanged { emailLayout.error = null }

        save.setOnClickListener {
            val fullName = name.text?.toString()?.trim().orEmpty()
            val mail = email.text?.toString()?.trim().orEmpty()
            nameLayout.error = if (fullName.isEmpty()) getString(R.string.profile_required) else null
            emailLayout.error = when {
                mail.isEmpty() -> getString(R.string.profile_required)
                !Patterns.EMAIL_ADDRESS.matcher(mail).matches() -> getString(R.string.error_invalid_email)
                else -> null
            }
            if (nameLayout.error != null || emailLayout.error != null) return@setOnClickListener
            viewModel.update(
                nic,
                UpdateProsumerRequest(
                    fullName = fullName,
                    email = mail,
                    phone = phone.text?.toString()?.trim()?.ifEmpty { null },
                    address = address.text?.toString()?.trim()?.ifEmpty { null }
                )
            )
        }

        collectWhileStarted(viewModel.save) { state ->
            val running = state is ActionState.Running
            save.isEnabled = !running
            progress.isVisible = running
            when (state) {
                is ActionState.Running -> errorCard.isVisible = false
                is ActionState.Failed -> {
                    errorCard.isVisible = true
                    errorText.text = state.error.displayText()
                }
                is ActionState.Done -> {
                    viewModel.consumeSave()
                    Snackbar.make(view, R.string.profile_saved, Snackbar.LENGTH_SHORT).show()
                    findNavController().navigateUp()
                }
                ActionState.Idle -> Unit
            }
        }
    }
}
