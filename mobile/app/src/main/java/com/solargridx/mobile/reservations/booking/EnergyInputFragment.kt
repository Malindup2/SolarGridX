package com.solargridx.mobile.reservations.booking

import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.LinearLayout
import androidx.core.view.isVisible
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.solargridx.mobile.R
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.ReservationFactsBinder
import com.solargridx.mobile.reservations.ui.setupBackToolbar

/**
 * Energy input after slot selection. The API requires energyKwh and enforces the
 * per-booking maximum (ENERGY_EXCEEDS_SLOT_CAPACITY); here we only check the
 * field is filled in, and show the limit so nobody is surprised.
 */
class EnergyInputFragment : Fragment(R.layout.fragment_energy_input) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupBackToolbar(view, getString(R.string.res_book_energy))

        val draft = ReservationArgs.draftFrom(arguments) ?: run {
            findNavController().navigateUp()
            return
        }

        ReservationFactsBinder.bindDraft(view.findViewById<LinearLayout>(R.id.factsContainer), draft, includeStation = true)

        val layout = view.findViewById<TextInputLayout>(R.id.energyLayout)
        val input = view.findViewById<TextInputEditText>(R.id.energyInput)
        layout.helperText = getString(R.string.res_energy_helper, Formatters.kwh(draft.capacityKwh))
        draft.energyKwh?.let {
            if (input.text.isNullOrEmpty()) input.setText(it.toBigDecimal().stripTrailingZeros().toPlainString())
        }
        bindQuickPicks(view, input, draft.capacityKwh)
        input.doAfterTextChanged { layout.error = null }

        fun submit() {
            val energy = input.text?.toString()?.trim()?.toDoubleOrNull()
            when {
                input.text.isNullOrBlank() -> layout.error = getString(R.string.res_energy_required)
                energy == null || energy <= 0 -> layout.error = getString(R.string.res_energy_positive)
                else -> findNavController().navigate(
                    R.id.action_energyInput_to_bookingConfirm,
                    ReservationArgs.draftBundle(draft.copy(energyKwh = energy))
                )
            }
        }

        input.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) { submit(); true } else false
        }
        view.findViewById<View>(R.id.continueButton).setOnClickListener { submit() }
    }

    /**
     * One-tap amounts. Only values within the slot's per-booking limit are
     * offered (a convenience; the API still enforces the limit).
     */
    private fun bindQuickPicks(view: View, input: TextInputEditText, capacityKwh: Double) {
        val group = view.findViewById<ChipGroup>(R.id.quickPicks)
        val amounts = QUICK_AMOUNTS.filter { it < capacityKwh } + capacityKwh
        if (capacityKwh <= 0) {
            group.isVisible = false
            view.findViewById<View>(R.id.quickPickLabel).isVisible = false
            return
        }
        amounts.distinct().forEach { amount ->
            val chip = layoutInflater.inflate(R.layout.item_day_chip, group, false) as Chip
            chip.id = View.generateViewId()
            chip.text = if (amount == capacityKwh) getString(R.string.res_quick_max, Formatters.kwh(amount)) else Formatters.kwh(amount)
            chip.setOnClickListener {
                input.setText(amount.toBigDecimal().stripTrailingZeros().toPlainString())
                input.setSelection(input.text?.length ?: 0)
            }
            group.addView(chip)
        }
    }

    private companion object {
        val QUICK_AMOUNTS = listOf(5.0, 10.0, 20.0)
    }
}
