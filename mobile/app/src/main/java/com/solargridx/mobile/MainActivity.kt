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
import com.solargridx.mobile.auth.AuthNavigator
import com.solargridx.mobile.session.SessionEvents
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
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
}
