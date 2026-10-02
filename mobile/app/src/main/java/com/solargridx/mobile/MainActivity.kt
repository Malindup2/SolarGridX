package com.solargridx.mobile

import android.os.Bundle
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.NavHostFragment
import com.solargridx.mobile.session.SessionManager
import com.solargridx.mobile.api.ActivityApi
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.shell.BottomNavController
import com.solargridx.mobile.shell.InboxBadge
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import com.solargridx.mobile.auth.AuthNavigator
import com.solargridx.mobile.session.SessionEvents
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)
        // Role-aware Material 3 navigation bar for the top-level screens.
        val navHost = supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val bottomNav = BottomNavController(
            findViewById(R.id.bottomNav), findViewById(R.id.nav_host_fragment), navHost.navController, SessionManager(this)
        ).also { it.attach() }

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            // The bottom inset goes to the navigation bar when it shows, else to the content.
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0)
            bottomNav.onBottomInset(systemBars.bottom)
            insets
        }

        // Unread notifications badge: refreshed every minute while the app is open and signed in.
        val session = SessionManager(this)
        val activityApi = ApiClient.retrofit.create(ActivityApi::class.java)
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch { InboxBadge.unread.collect { bottomNav.setUnread(it) } }
                while (isActive) {
                    if (session.isLoggedIn() && !session.isPendingProsumer()) {
                        (safeApiCall { activityApi.inbox() } as? ApiResult.Success)?.let { InboxBadge.set(it.data.unreadCount) }
                    } else {
                        InboxBadge.set(0)
                    }
                    delay(INBOX_POLL_MS)
                }
            }
        }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                SessionEvents.expired.collect {
                    val navHost = supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as? NavHostFragment
                    val navController = navHost?.navController ?: return@collect
                    Toast.makeText(this@MainActivity, R.string.session_expired, Toast.LENGTH_LONG).show()
                    AuthNavigator.goToLogin(navController)
                }
            }
        }
    }

    private companion object {
        const val INBOX_POLL_MS = 60_000L
    }
}
