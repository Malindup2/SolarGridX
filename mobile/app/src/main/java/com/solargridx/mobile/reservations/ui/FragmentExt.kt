package com.solargridx.mobile.reservations.ui

import android.content.res.ColorStateList
import android.view.View
import android.widget.ImageView
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.google.android.material.appbar.MaterialToolbar
import com.solargridx.mobile.R
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch

/** Collects a flow only while the view is at least STARTED. */
fun <T> Fragment.collectWhileStarted(flow: Flow<T>, block: (T) -> Unit) {
    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            flow.collect { block(it) }
        }
    }
}

/** Toolbar with a back arrow that pops the back stack. */
fun Fragment.setupBackToolbar(view: View, title: CharSequence) {
    view.findViewById<MaterialToolbar>(R.id.toolbar).apply {
        this.title = title
        setNavigationIcon(R.drawable.ic_arrow_back)
        setNavigationContentDescription(R.string.res_back)
        setNavigationOnClickListener { findNavController().navigateUp() }
    }
}

/** Binds an included view_stat tile; the icon circle takes the given status style's colours. */
fun View.bindStat(includeId: Int, value: String, label: String, style: StatusStyle? = null, @DrawableRes icon: Int? = null) {
    val tile = findViewById<View>(includeId)
    tile.findViewById<TextView>(R.id.statValue).text = value
    tile.findViewById<TextView>(R.id.statLabel).text = label
    tile.findViewById<ImageView>(R.id.statIcon).apply {
        if (icon != null) setImageResource(icon)
        if (style != null) {
            backgroundTintList = ContextCompat.getColorStateList(context, style.container)
            imageTintList = ColorStateList.valueOf(ContextCompat.getColor(context, style.color))
        }
    }
    tile.contentDescription = "$label: $value"
}
