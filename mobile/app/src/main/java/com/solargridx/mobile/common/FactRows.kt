package com.solargridx.mobile.common

import android.view.LayoutInflater
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.DrawableRes
import com.solargridx.mobile.R

/** Icon / label / value rows (item_fact.xml) for any detail card. */
object FactRows {

    data class Fact(@DrawableRes val icon: Int, val label: String, val value: String)

    fun bind(container: LinearLayout, facts: List<Fact>) {
        container.removeAllViews()
        val inflater = LayoutInflater.from(container.context)
        facts.forEach { fact ->
            val row = inflater.inflate(R.layout.item_fact, container, false)
            row.findViewById<ImageView>(R.id.factIcon).setImageResource(fact.icon)
            row.findViewById<TextView>(R.id.factLabel).text = fact.label
            row.findViewById<TextView>(R.id.factValue).text = fact.value
            row.contentDescription = "${fact.label}: ${fact.value}"
            container.addView(row)
        }
    }
}
