package com.solargridx.mobile.common

import android.content.res.ColorStateList
import android.view.View
import android.widget.ImageView
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.view.isVisible
import com.solargridx.mobile.R

/**
 * Binds the shared `view_state.xml` include: a loading spinner, an error block
 * (server message, then details underneath) with Retry, or an empty message.
 */
class StateViews(root: View, onRetry: () -> Unit) {

    private val container: View = root.findViewById(R.id.stateContainer)
    private val progress: ProgressBar = root.findViewById(R.id.stateProgress)
    private val title: TextView = root.findViewById(R.id.stateTitle)
    private val message: TextView = root.findViewById(R.id.stateMessage)
    private val retry: Button = root.findViewById(R.id.stateRetry)
    private val icon: ImageView = root.findViewById(R.id.stateIcon)

    init {
        retry.setOnClickListener { onRetry() }
    }

    fun showLoading() {
        container.isVisible = true
        icon.isVisible = false
        progress.isVisible = true
        title.isVisible = false
        message.isVisible = false
        retry.isVisible = false
    }

    fun showError(error: ApiError) {
        if (error.httpStatus == 404) {
            // Retrying won't make a missing record appear: explain instead.
            showEmpty(title.context.getString(R.string.res_not_found_title), error.message, R.drawable.ic_res_search)
            return
        }
        container.isVisible = true
        progress.isVisible = false
        showIcon(R.drawable.ic_res_close, R.color.status_rejected, R.color.status_rejected_container)
        title.isVisible = true
        title.text = error.message
        message.isVisible = error.details.isNotEmpty()
        message.text = error.details.joinToString(separator = "\n") { "• $it" }
        retry.isVisible = true
    }

    fun showEmpty(titleText: String, messageText: String? = null, @DrawableRes iconRes: Int = R.drawable.ic_res_inbox) {
        container.isVisible = true
        progress.isVisible = false
        showIcon(iconRes, R.color.color_primary, R.color.status_approved_container)
        title.isVisible = true
        title.text = titleText
        message.isVisible = messageText != null
        message.text = messageText
        retry.isVisible = false
    }

    private fun showIcon(@DrawableRes res: Int, @ColorRes tint: Int, @ColorRes background: Int) {
        icon.isVisible = true
        icon.setImageResource(res)
        icon.imageTintList = ColorStateList.valueOf(ContextCompat.getColor(icon.context, tint))
        icon.backgroundTintList = ContextCompat.getColorStateList(icon.context, background)
    }

    fun hide() {
        container.isVisible = false
    }
}

/** One line for inline errors and dialogs: message plus any details. */
fun ApiError.displayText(): String =
    if (details.isEmpty()) message else message + "\n" + details.joinToString("\n") { "• $it" }
