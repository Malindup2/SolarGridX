package com.solargridx.mobile.slots

import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.solargridx.mobile.R


class SlotsHomeFragment : Fragment(R.layout.fragment_placeholder) {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        view.findViewById<TextView>(R.id.placeholderText).text = "Slots — Member 4"
    }
}
