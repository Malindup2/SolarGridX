package com.solargridx.mobile.auth

import android.os.Bundle
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.ImageView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.solargridx.mobile.R
import com.solargridx.mobile.session.SessionManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SplashFragment : Fragment(R.layout.fragment_splash) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val splashLogo = view.findViewById<ImageView>(R.id.splashLogo)

        // Micro-animations on logo
        splashLogo?.alpha = 0f
        splashLogo?.scaleX = 0.82f
        splashLogo?.scaleY = 0.82f

        splashLogo?.animate()
            ?.alpha(1f)
            ?.scaleX(1f)
            ?.scaleY(1f)
            ?.setDuration(850)
            ?.setInterpolator(AccelerateDecelerateInterpolator())
            ?.start()

        val sessionManager = SessionManager(requireContext())

        viewLifecycleOwner.lifecycleScope.launch {
            delay(1800)
            if (!isAdded) return@launch

            if (sessionManager.isLoggedIn()) {
                // Already authenticated — route directly to reservations/home
                try {
                    findNavController().navigate(R.id.reservations_nav)
                } catch (e: Exception) {
                    findNavController().navigate(R.id.action_splashFragment_to_loginFragment)
                }
            } else {
                findNavController().navigate(R.id.action_splashFragment_to_loginFragment)
            }
        }
    }
}
