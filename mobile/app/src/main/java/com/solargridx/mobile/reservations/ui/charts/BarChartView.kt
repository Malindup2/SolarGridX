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
 * Rounded vertical bar chart drawn on Canvas (no chart library). One bar per
 * label; the highlighted bar uses the accent colour and shows its value above.
 * Bars grow up from the baseline when data is set.
 */
class BarChartView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    data class Bar(val label: String, val value: Float, val valueLabel: String)

    private var bars: List<Bar> = emptyList()
    private var highlight = -1
    private var progress = 1f

    // Defaults come from the semantic tokens.
    @ColorInt var barColor: Int = ContextCompat.getColorStateList(context, R.color.res_bar_soft)!!.defaultColor
    @ColorInt var highlightColor: Int = ContextCompat.getColor(context, R.color.color_primary)
    @ColorInt var trackColor: Int = ContextCompat.getColor(context, R.color.color_background)
    @ColorInt var labelColor: Int = ContextCompat.getColor(context, R.color.color_muted)
    @ColorInt var valueColor: Int = ContextCompat.getColor(context, R.color.color_ink)

    private val density = resources.displayMetrics.density
    private val barPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
        textSize = 11 * resources.displayMetrics.scaledDensity
        typeface = ResourcesCompat.getFont(context, R.font.poppins_regular)
    }
    private val valuePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
        textSize = 11 * resources.displayMetrics.scaledDensity
        typeface = ResourcesCompat.getFont(context, R.font.poppins_semibold)
    }
    private val rect = RectF()

    fun setData(bars: List<Bar>, highlightIndex: Int = -1, animate: Boolean = true) {
        this.bars = bars
        this.highlight = highlightIndex
        contentDescription = bars.joinToString(", ") { "${it.label}: ${it.valueLabel}" }
        if (animate && Motion.enabled(this)) {
            ValueAnimator.ofFloat(0f, 1f).apply {
                duration = 650
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
        if (bars.isEmpty()) return
        val labelArea = labelPaint.textSize + 10 * density
        val valueArea = valuePaint.textSize + 8 * density
        val chartTop = paddingTop + valueArea
        val chartBottom = height - paddingBottom - labelArea
        val chartHeight = (chartBottom - chartTop).coerceAtLeast(1f)
        val slot = (width - paddingLeft - paddingRight).toFloat() / bars.size
        val barWidth = (slot * 0.46f).coerceAtMost(28 * density)
        val radius = barWidth / 2
        val max = bars.maxOf { it.value }.coerceAtLeast(1f)

        bars.forEachIndexed { index, bar ->
            val cx = paddingLeft + slot * index + slot / 2
            val left = cx - barWidth / 2
            // Track: full-height pill behind each bar, as in the reference statistics chart.
            barPaint.color = trackColor
            rect.set(left, chartTop, left + barWidth, chartBottom)
            canvas.drawRoundRect(rect, radius, radius, barPaint)

            val h = (bar.value / max) * chartHeight * progress
            if (h > 0f) {
                barPaint.color = if (index == highlight) highlightColor else barColor
                rect.set(left, chartBottom - h.coerceAtLeast(barWidth), left + barWidth, chartBottom)
                canvas.drawRoundRect(rect, radius, radius, barPaint)
            }
            if (bar.value > 0f && (index == highlight || bars.size <= 7)) {
                valuePaint.color = valueColor
                valuePaint.alpha = (255 * progress).toInt()
                canvas.drawText(bar.valueLabel, cx, chartBottom - h.coerceAtLeast(barWidth) - 6 * density, valuePaint)
            }
            labelPaint.color = labelColor
            labelPaint.isFakeBoldText = index == highlight
            canvas.drawText(bar.label, cx, height - paddingBottom - 2 * density, labelPaint)
        }
    }
}
