package com.solargridx.mobile.reservations.ui

import android.provider.Settings
import android.view.View
import android.view.ViewGroup
import android.view.animation.AnimationUtils
import android.view.animation.LayoutAnimationController
import android.view.animation.OvershootInterpolator
import androidx.core.view.children
import androidx.core.view.isVisible
import androidx.interpolator.view.animation.FastOutSlowInInterpolator
import androidx.recyclerview.widget.RecyclerView
import com.solargridx.mobile.R

/*
 * Small, purposeful motion for the reservation screens: content rises in on
 * first show, lists cascade, the success check pops. Everything is skipped
 * when the user has turned animations off in system settings.
 */
object Motion {
    const val RISE_MS = 360L
    const val STAGGER_MS = 55L

    fun enabled(view: View): Boolean =
        Settings.Global.getFloat(view.context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
}

/** Fades in while rising a few dp. */
fun View.riseIn(delay: Long = 0L) {
    if (!Motion.enabled(this)) return
    alpha = 0f
    translationY = resources.displayMetrics.density * 16
    animate()
        .alpha(1f)
        .translationY(0f)
        .setStartDelay(delay)
        .setDuration(Motion.RISE_MS)
        .setInterpolator(FastOutSlowInInterpolator())
        .start()
}

/** Rises each visible direct child in turn, top to bottom. */
fun ViewGroup.staggerChildrenIn(startDelay: Long = 0L) {
    children.filter { it.isVisible }.forEachIndexed { index, child -> child.riseIn(startDelay + index * Motion.STAGGER_MS) }
}

/** Scales up from small with a soft overshoot: for the success / outcome icon. */
fun View.popIn(delay: Long = 0L) {
    if (!Motion.enabled(this)) return
    alpha = 0f
    scaleX = 0.4f
    scaleY = 0.4f
    animate()
        .alpha(1f)
        .scaleX(1f)
        .scaleY(1f)
        .setStartDelay(delay)
        .setDuration(450)
        .setInterpolator(OvershootInterpolator(2.2f))
        .start()
}

/** Cascades the list's items in (call when the content set changes, e.g. a new filter). */
fun RecyclerView.cascadeIn() {
    if (!Motion.enabled(this)) return
    if (layoutAnimation == null) {
        layoutAnimation = LayoutAnimationController(AnimationUtils.loadAnimation(context, R.anim.res_item_rise), 0.12f)
    }
    scheduleLayoutAnimation()
}
