package com.solargridx.mobile.reservations.ui.charts

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.annotation.ColorInt
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import com.solargridx.mobile.R
import com.solargridx.mobile.reservations.ui.Motion

/**
 * Ring / donut chart drawn on Canvas (no chart library). Segments sweep in
 * clockwise from 12 o'clock; an optional value and caption sit in the centre.
 */
class DonutChartView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    data class Segment(val value: Float, @ColorInt val color: Int)

    private var segments: List<Segment> = emptyList()
    private var centerValue: String = ""
    private var centerCaption: String = ""
    private var progress = 1f

    // Defaults come from the semantic tokens; screens override them (e.g. white on the green hero).
    @ColorInt var trackColor: Int = ContextCompat.getColor(context, R.color.color_border)
    @ColorInt var centerValueColor: Int = ContextCompat.getColor(context, R.color.color_ink)
    @ColorInt var centerCaptionColor: Int = ContextCompat.getColor(context, R.color.color_muted)
    var strokeWidthPx: Float = resources.displayMetrics.density * 14
    /** Small gap between segments, in degrees. */
    var gapDegrees: Float = 3f

    private val arcPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }
    private val valuePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
        typeface = ResourcesCompat.getFont(context, R.font.poppins_semibold)
    }
    private val captionPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
        typeface = ResourcesCompat.getFont(context, R.font.poppins_regular)
    }
    private val oval = RectF()

    fun setData(segments: List<Segment>, centerValue: String = "", centerCaption: String = "", animate: Boolean = true) {
        this.segments = segments.filter { it.value > 0f }
        this.centerValue = centerValue
        this.centerCaption = centerCaption
        contentDescription = listOf(centerValue, centerCaption).filter { it.isNotEmpty() }.joinToString(" ")
        if (animate && Motion.enabled(this)) {
            ValueAnimator.ofFloat(0f, 1f).apply {
                duration = 700
                interpolator = DecelerateInterpolator()
                addUpdateListener { progress = it.animatedValue as Float; invalidate() }
            }.start()
        } else {
            progress = 1f
            invalidate()
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val size = minOf(width - paddingLeft - paddingRight, height - paddingTop - paddingBottom).toFloat()
        val half = strokeWidthPx / 2
        val left = paddingLeft + (width - paddingLeft - paddingRight - size) / 2 + half
        val top = paddingTop + (height - paddingTop - paddingBottom - size) / 2 + half
        oval.set(left, top, left + size - strokeWidthPx, top + size - strokeWidthPx)
        arcPaint.strokeWidth = strokeWidthPx

        // Track
        arcPaint.color = trackColor
        canvas.drawArc(oval, 0f, 360f, false, arcPaint)

        // Segments
        val total = segments.sumOf { it.value.toDouble() }.toFloat()
        if (total > 0f) {
            val gap = if (segments.size > 1) gapDegrees else 0f
            var start = -90f
            val available = 360f * progress
            segments.forEach { segment ->
                val sweep = (segment.value / total) * available
                arcPaint.color = segment.color
                val drawn = (sweep - gap).coerceAtLeast(0.5f)
                canvas.drawArc(oval, start + gap / 2, drawn, false, arcPaint)
                start += sweep
            }
        }

        // Centre text
        val cx = oval.centerX()
        val cy = oval.centerY()
        val inner = oval.width() - strokeWidthPx
        valuePaint.color = centerValueColor
        valuePaint.textSize = inner * if (centerValue.length > 4) 0.2f else 0.26f
        captionPaint.color = centerCaptionColor
        captionPaint.textSize = inner * 0.11f
        if (centerValue.isNotEmpty()) {
            val offset = if (centerCaption.isNotEmpty()) captionPaint.textSize * 0.4f else 0f
            canvas.drawText(centerValue, cx, cy + valuePaint.textSize * 0.35f - offset, valuePaint)
        }
        if (centerCaption.isNotEmpty()) {
            canvas.drawText(centerCaption, cx, cy + valuePaint.textSize * 0.35f + captionPaint.textSize * 1.1f, captionPaint)
        }
    }
}
