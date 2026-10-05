package com.solargridx.mobile.shell

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.ProfileApi
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.session.SessionManager
import kotlinx.coroutines.launch

/**
 * The profile photo circle at the top of both home screens. Shows the initials at once and
 * swaps in the photo when there is one. The photo is kept in memory against the account and
 * its version, so coming back to Home only asks the server whether it changed. Tapping it
 * opens the Profile tab, where the photo is changed.
 */
object HomeAvatar {

    private var cachedKey: String? = null
    private var cachedBitmap: Bitmap? = null

    fun bind(fragment: Fragment, name: String) {
        val view = fragment.requireView()
        val initials = view.findViewById<TextView>(R.id.homeAvatarInitials)
        val image = view.findViewById<ImageView>(R.id.homeAvatarImage)
        val session = SessionManager(fragment.requireContext())
        val account = session.getNic() ?: name

        initials.text = initialsOf(name)
        view.findViewById<View>(R.id.homeAvatarFrame).setOnClickListener {
            fragment.requireActivity().findViewById<BottomNavigationView>(R.id.bottomNav)?.selectedItemId = R.id.identity_nav
        }

        if (cachedKey?.startsWith("$account|") == true) show(image, cachedBitmap)

        fragment.viewLifecycleOwner.lifecycleScope.launch {
            val api = ApiClient.retrofit.create(ProfileApi::class.java)
            val profile = (safeApiCall { api.me() } as? ApiResult.Success)?.data ?: return@launch
            val version = profile.avatarVersion
            if (version == null) {
                cachedKey = null
                cachedBitmap = null
                show(image, null)
                return@launch
            }
            val key = "$account|$version"
            if (key != cachedKey) {
                val bitmap = runCatching {
                    api.avatar().takeIf { it.isSuccessful }?.body()?.bytes()
                        ?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
                }.getOrNull()
                cachedKey = key.takeIf { bitmap != null }
                cachedBitmap = bitmap
            }
            show(image, cachedBitmap)
        }
    }

    private fun show(image: ImageView, bitmap: Bitmap?) {
        image.setImageBitmap(bitmap)
        image.isVisible = bitmap != null
    }

    private fun initialsOf(name: String) =
        name.split(Regex("\\s+")).filter { it.isNotEmpty() }.take(2).joinToString("") { it.first().uppercase() }
}
