package com.solargridx.mobile.shell

import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.solargridx.mobile.reservations.ui.Formatters
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Keeps a home header's date line current: today's date and the time in Sri Lanka (the system's time
 * zone), refreshed on every minute change while the screen is showing.
 */
object HomeClock {

    fun bind(fragment: Fragment, view: TextView) {
        fragment.viewLifecycleOwner.lifecycleScope.launch {
            fragment.viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (true) {
                    view.text = Formatters.nowLabel()
                    view.contentDescription = Formatters.nowLabel() + ", Sri Lanka time"
                    delay(60_000L - System.currentTimeMillis() % 60_000L)
                }
            }
        }
    }
}
