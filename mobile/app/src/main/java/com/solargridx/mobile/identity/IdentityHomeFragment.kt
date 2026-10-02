package com.solargridx.mobile.identity

import android.content.res.ColorStateList
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.ProfileApi
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.safeApiCall
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.solargridx.mobile.R
import com.solargridx.mobile.auth.AuthNavigator
import com.solargridx.mobile.common.ActionState
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.common.displayText
import com.solargridx.mobile.dto.ProsumerResponse
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.reservations.ui.staggerChildrenIn
import com.solargridx.mobile.session.LogoutHelper
import com.solargridx.mobile.shell.InboxBadge
import com.solargridx.mobile.session.SessionManager
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Profile tab (FRONTEND-OWNERSHIP §5): account card, details, edit profile,
 * change password, logout, and self-deactivation. Prosumers load their record
 * from GET /prosumers/{nic}; operators have no prosumer record, so they get an
 * account card from the session plus password and logout.
 */
class IdentityHomeFragment : Fragment(R.layout.fragment_profile) {

    // Shared with Edit profile so a save shows here straight away.
    private val viewModel: ProfileViewModel by activityViewModels()

    private val profileApi by lazy { ApiClient.retrofit.create(ProfileApi::class.java) }
    private var hasPhoto = false

    // System photo picker: no storage permission needed.
    private val pickPhoto = registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) uploadPhoto(uri)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val session = SessionManager(requireContext())
        val nic = session.getNic()
        val isProsumer = session.getRole() == "Prosumer" && nic != null

        val content = view.findViewById<View>(R.id.content)
        val states = StateViews(view) { nic?.let { viewModel.load(it) } }

        bindHeader(view, session.getDisplayName().orEmpty(), null, if (isProsumer) R.string.profile_role_prosumer else R.string.profile_role_operator)
        bindActions(view, isProsumer)
        view.findViewById<View>(R.id.avatarFrame).setOnClickListener { onAvatarTapped() }
        loadPhoto()
        view.findViewById<View>(R.id.dangerTitle).isVisible = isProsumer
        view.findViewById<View>(R.id.dangerCard).isVisible = isProsumer

        if (!isProsumer) {
            view.findViewById<LinearLayout>(R.id.detailRows).apply {
                removeAllViews()
                addRow(this, R.drawable.ic_res_person, getString(R.string.profile_full_name), session.getDisplayName(), chevron = false)
            }
            return
        }

        bindDanger(view, nic!!)

        collectWhileStarted(viewModel.profile) { state ->
            when (state) {
                is UiState.Loading -> { content.isVisible = false; states.showLoading() }
                is UiState.Error -> { content.isVisible = false; states.showError(state.error) }
                is UiState.Content -> {
                    states.hide()
                    if (!content.isVisible) (content as ViewGroup).staggerChildrenIn()
                    content.isVisible = true
                    bindProfile(view, state.data)
                }
            }
        }

        collectWhileStarted(viewModel.deactivate) { state ->
            when (state) {
                is ActionState.Done -> {
                    viewModel.consumeDeactivate()
                    // The token stops working once the account is deactivated; sign out locally.
                    session.clear()
                    Toast.makeText(requireContext(), R.string.profile_deactivated, Toast.LENGTH_LONG).show()
                    AuthNavigator.goToLogin(findNavController())
                }
                is ActionState.Failed -> {
                    viewModel.consumeDeactivate()
                    MaterialAlertDialogBuilder(requireContext(), R.style.ThemeOverlay_SolarGridX_Res_Dialog)
                        .setTitle(R.string.profile_deactivate)
                        .setMessage(state.error.displayText())
                        .setPositiveButton(android.R.string.ok, null)
                        .show()
                }
                else -> Unit
            }
        }

        viewModel.load(nic)
    }

    private fun bindProfile(view: View, profile: ProsumerResponse) {
        bindHeader(view, profile.fullName, profile, R.string.profile_role_prosumer)
        view.findViewById<LinearLayout>(R.id.detailRows).apply {
            removeAllViews()
            addRow(this, R.drawable.ic_res_badge, getString(R.string.res_label_nic), profile.nic, chevron = false)
            addRow(this, R.drawable.ic_res_mail, getString(R.string.profile_email), profile.email, chevron = false)
            addRow(this, R.drawable.ic_res_phone, getString(R.string.profile_phone), profile.phone ?: getString(R.string.profile_not_set), chevron = false)
            addRow(this, R.drawable.ic_res_pin, getString(R.string.profile_address), profile.address ?: getString(R.string.profile_not_set), chevron = false)
        }
    }

    private fun bindHeader(view: View, name: String, profile: ProsumerResponse?, roleLabel: Int) {
        view.findViewById<TextView>(R.id.avatar).text = initials(name)
        view.findViewById<TextView>(R.id.profileName).text = name
        view.findViewById<TextView>(R.id.profileSubtitle).text = profile?.email ?: getString(roleLabel)
        view.findViewById<TextView>(R.id.profileStatus).apply {
            isVisible = profile != null
            text = profile?.status
        }
        view.findViewById<TextView>(R.id.profileSince).apply {
            isVisible = profile != null
            text = profile?.let { getString(R.string.profile_member_since, memberSince(it.createdAt)) }
        }
    }

    // ---- profile photo (GET/PUT/DELETE /users/me/avatar) ----

    private fun loadPhoto() {
        viewLifecycleOwner.lifecycleScope.launch {
            val profile = (safeApiCall { profileApi.me() } as? ApiResult.Success)?.data
            hasPhoto = profile?.avatarVersion != null
            val bitmap = if (hasPhoto) {
                runCatching {
                    profileApi.avatar().takeIf { it.isSuccessful }?.body()?.bytes()
                        ?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
                }.getOrNull()
            } else null
            val image = view?.findViewById<ImageView>(R.id.avatarImage) ?: return@launch
            image.setImageBitmap(bitmap)
            image.isVisible = bitmap != null
        }
    }

    private fun onAvatarTapped() {
        val pick = { pickPhoto.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }
        if (!hasPhoto) {
            pick()
            return
        }
        MaterialAlertDialogBuilder(requireContext(), R.style.ThemeOverlay_SolarGridX_Res_Dialog)
            .setItems(arrayOf(getString(R.string.avatar_change), getString(R.string.avatar_remove))) { _, which ->
                if (which == 0) pick() else removePhoto()
            }
            .show()
    }

    private fun uploadPhoto(uri: Uri) {
        val resolver = requireContext().contentResolver
        val mime = resolver.getType(uri)
        val bytes = runCatching { resolver.openInputStream(uri)?.use { it.readBytes() } }.getOrNull()
        when (AvatarPhoto.problem(mime, bytes?.size?.toLong() ?: 0)) {
            AvatarPhoto.Problem.TOO_LARGE -> return toast(getString(R.string.avatar_too_large))
            AvatarPhoto.Problem.WRONG_TYPE, AvatarPhoto.Problem.EMPTY -> return toast(getString(R.string.avatar_wrong_type))
            null -> Unit
        }
        val part = MultipartBody.Part.createFormData(
            "file", AvatarPhoto.fileName(mime!!), bytes!!.toRequestBody(mime.toMediaType())
        )
        viewLifecycleOwner.lifecycleScope.launch {
            when (val result = safeApiCall { profileApi.uploadAvatar(part) }) {
                is ApiResult.Success -> { toast(getString(R.string.avatar_updated)); loadPhoto() }
                is ApiResult.Failure -> toast(result.error.displayText())
            }
        }
    }

    private fun removePhoto() {
        viewLifecycleOwner.lifecycleScope.launch {
            when (val result = safeApiCall { profileApi.removeAvatar() }) {
                is ApiResult.Success -> { toast(getString(R.string.avatar_removed)); loadPhoto() }
                is ApiResult.Failure -> toast(result.error.displayText())
            }
        }
    }

    private fun toast(text: String) = Toast.makeText(requireContext(), text, Toast.LENGTH_LONG).show()

    private fun bindActions(view: View, isProsumer: Boolean) {
        view.findViewById<LinearLayout>(R.id.actionRows).apply {
            removeAllViews()
            if (isProsumer) {
                addRow(this, R.drawable.ic_res_edit, getString(R.string.profile_personal_info), getString(R.string.profile_personal_info_hint)) {
                    findNavController().navigate(R.id.action_identityHome_to_editProfile)
                }
            }
            val unread = InboxBadge.unread.value
            addRow(
                this, R.drawable.ic_res_inbox, getString(R.string.profile_row_notifications),
                if (unread > 0) getString(R.string.inbox_unread_badge, unread) else null
            ) {
                findNavController().navigate(R.id.action_identityHome_to_inbox)
            }
            addRow(this, R.drawable.ic_res_lock, getString(R.string.profile_change_password), null) {
                findNavController().navigate(R.id.action_identityHome_to_changePassword)
            }
            addRow(this, R.drawable.ic_res_logout, getString(R.string.profile_logout), null, tint = R.color.status_cancelled) {
                LogoutHelper.confirmAndLogout(this@IdentityHomeFragment)
            }
        }
    }

    private fun bindDanger(view: View, nic: String) {
        view.findViewById<LinearLayout>(R.id.dangerRows).apply {
            removeAllViews()
            addRow(
                this, R.drawable.ic_res_close, getString(R.string.profile_deactivate),
                getString(R.string.profile_deactivate_hint), tint = R.color.status_rejected
            ) {
                MaterialAlertDialogBuilder(requireContext(), R.style.ThemeOverlay_SolarGridX_Res_Dialog_Destructive)
                    .setTitle(R.string.profile_deactivate_title)
                    .setMessage(R.string.profile_deactivate_body)
                    .setNegativeButton(R.string.res_keep, null)
                    .setPositiveButton(R.string.profile_deactivate) { _, _ -> viewModel.deactivate(nic) }
                    .show()
            }
        }
    }

    private fun addRow(
        parent: LinearLayout,
        @DrawableRes icon: Int,
        label: String,
        value: String?,
        chevron: Boolean = true,
        @ColorRes tint: Int = R.color.color_primary,
        onClick: (() -> Unit)? = null
    ) {
        val row = layoutInflater.inflate(R.layout.item_profile_row, parent, false)
        val context = requireContext()
        row.findViewById<ImageView>(R.id.rowIcon).apply {
            setImageResource(icon)
            imageTintList = ColorStateList.valueOf(ContextCompat.getColor(context, tint))
            backgroundTintList = ContextCompat.getColorStateList(context, containerFor(tint))
        }
        row.findViewById<TextView>(R.id.rowLabel).apply {
            text = label
            if (tint == R.color.status_rejected) setTextColor(ContextCompat.getColor(context, tint))
        }
        row.findViewById<TextView>(R.id.rowValue).apply {
            isVisible = value != null
            text = value
        }
        row.findViewById<View>(R.id.rowChevron).isVisible = chevron && onClick != null
        if (onClick != null) row.setOnClickListener { onClick() } else row.isClickable = false
        row.contentDescription = listOfNotNull(label, value).joinToString(", ")
        parent.addView(row)
    }

    private fun containerFor(@ColorRes tint: Int) = when (tint) {
        R.color.status_rejected -> R.color.status_rejected_container
        R.color.status_cancelled -> R.color.status_cancelled_container
        else -> R.color.status_approved_container
    }

    private fun initials(name: String) =
        name.split(Regex("\\s+")).filter { it.isNotEmpty() }.take(2).joinToString("") { it.first().uppercase() }

    private fun memberSince(iso: String): String {
        val date = Formatters.slotDate(iso)
        return runCatching {
            val parsed = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.parse(iso.take(10))
            SimpleDateFormat("MMM yyyy", Locale.getDefault()).format(parsed!!)
        }.getOrDefault(date)
    }
}
