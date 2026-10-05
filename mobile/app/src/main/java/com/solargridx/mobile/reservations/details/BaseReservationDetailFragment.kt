package com.solargridx.mobile.reservations.details

import com.solargridx.mobile.reservations.ui.staggerChildrenIn
import android.view.ViewGroup
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.solargridx.mobile.R
import com.solargridx.mobile.common.ActionState
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.common.displayText
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.ReservationNav
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.ReservationFactsBinder
import com.solargridx.mobile.reservations.ui.bindStatus
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.reservations.ui.setupBackToolbar

/**
 * Shared screen for one reservation: status, completion / rejection cards,
 * details, and up to three actions. Subclasses decide which actions apply.
 * GET /reservations/{id}
 */
abstract class BaseReservationDetailFragment : Fragment(R.layout.fragment_booking_details) {

    protected val viewModel: ReservationDetailViewModel by viewModels()

    @get:StringRes
    protected abstract val titleRes: Int
    protected open val showNic: Boolean = false

    /** Configure primary / secondary / danger buttons for this reservation. */
    protected abstract fun bindActions(reservation: ReservationResponse, actions: Actions)

    protected class Actions(val primary: MaterialButton, val secondary: MaterialButton, val danger: MaterialButton) {
        fun hideAll() = listOf(primary, secondary, danger).forEach { it.isVisible = false }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupBackToolbar(view, getString(titleRes))

        val id = arguments?.getString(ReservationArgs.RESERVATION_ID) ?: run {
            findNavController().navigateUp()
            return
        }

        val states = StateViews(view) { viewModel.load(id) }
        val content = view.findViewById<View>(R.id.content)
        val headline = view.findViewById<TextView>(R.id.headline)
        val statusChip = view.findViewById<Chip>(R.id.statusChip)
        val statusNote = view.findViewById<TextView>(R.id.statusNote)
        val completedCard = view.findViewById<View>(R.id.completedCard)
        val completedBody = view.findViewById<TextView>(R.id.completedBody)
        val rejectedCard = view.findViewById<View>(R.id.rejectedCard)
        val rejectedReason = view.findViewById<TextView>(R.id.rejectedReason)
        val facts = view.findViewById<LinearLayout>(R.id.factsContainer)
        val errorCard = view.findViewById<View>(R.id.inlineError)
        val errorText = view.findViewById<TextView>(R.id.inlineErrorText)
        val progress = view.findViewById<View>(R.id.actionProgress)
        val actions = Actions(
            view.findViewById(R.id.primaryAction),
            view.findViewById(R.id.secondaryAction),
            view.findViewById(R.id.dangerAction)
        )

        collectWhileStarted(viewModel.state) { state ->
            when (state) {
                is UiState.Loading -> { content.isVisible = false; states.showLoading() }
                is UiState.Error -> { content.isVisible = false; states.showError(state.error) }
                is UiState.Content -> {
                    states.hide()
                    if (!content.isVisible) (content as ViewGroup).staggerChildrenIn()
                    content.isVisible = true
                    val r = state.data
                    headline.text = if (showNic) viewModel.prosumerName.value ?: r.nic else r.stationName
                    if (showNic) viewModel.loadProsumerName(r.nic)
                    statusChip.bindStatus(r.status)
                    statusNote.text = statusNote(r)
                    statusNote.isVisible = statusNote.text.isNotEmpty()

                    completedCard.isVisible = r.status == "Completed"
                    completedBody.text = getString(
                        R.string.res_completed_body,
                        Formatters.kwh(r.energyKwh), r.stationName, Formatters.dateTime(r.completedAt ?: r.updatedAt)
                    )
                    rejectedCard.isVisible = r.status == "Rejected" && !r.rejectionReason.isNullOrBlank()
                    rejectedReason.text = r.rejectionReason

                    bindStrip(view, R.id.stripEnergy, Formatters.kwh(r.energyKwh), R.string.res_label_energy)
                    bindStrip(view, R.id.stripSlot, r.startTime, R.string.res_label_slot)
                    bindStrip(view, R.id.stripDate, Formatters.dayChip(r.reservationDate), R.string.res_label_date)
                    ReservationFactsBinder.bind(facts, r, showNic, includeSchedule = false, prosumerName = viewModel.prosumerName.value)
                    actions.hideAll()
                    bindActions(r, actions)
                }
            }
        }

        if (showNic) {
            collectWhileStarted(viewModel.prosumerName) { name ->
                val r = (viewModel.state.value as? UiState.Content)?.data ?: return@collectWhileStarted
                if (name != null) {
                    headline.text = name
                    ReservationFactsBinder.bind(facts, r, showNic, includeSchedule = false, prosumerName = name)
                }
            }
        }

        collectWhileStarted(viewModel.action) { state ->
            val running = state is ActionState.Running
            progress.isVisible = running
            listOf(actions.primary, actions.secondary, actions.danger).forEach { it.isEnabled = !running }
            when (state) {
                is ActionState.Running -> errorCard.isVisible = false
                is ActionState.Failed -> {
                    errorCard.isVisible = true
                    errorText.text = state.error.displayText()
                }
                is ActionState.Done -> {
                    viewModel.consumeAction()
                    ReservationNav.toSummary(this, state.data.action, state.data.reservation)
                }
                ActionState.Idle -> Unit
            }
        }

        viewModel.load(id)
    }

    protected open fun statusNote(reservation: ReservationResponse): String = ""

    private fun bindStrip(root: View, includeId: Int, value: String, @StringRes label: Int) {
        val column = root.findViewById<View>(includeId)
        column.findViewById<TextView>(R.id.stripValue).text = value
        column.findViewById<TextView>(R.id.stripLabel).setText(label)
        column.contentDescription = "${getString(label)}: $value"
    }

    protected fun MaterialButton.show(@StringRes label: Int, @DrawableRes icon: Int? = null, onClick: () -> Unit) {
        isVisible = true
        setText(label)
        if (icon != null) setIconResource(icon) else this.icon = null
        setOnClickListener { onClick() }
    }

    protected fun confirm(
        @StringRes title: Int,
        message: String,
        @StringRes positive: Int,
        destructive: Boolean = false,
        onConfirm: () -> Unit
    ) {
        val theme = if (destructive) R.style.ThemeOverlay_SolarGridX_Res_Dialog_Destructive else R.style.ThemeOverlay_SolarGridX_Res_Dialog
        MaterialAlertDialogBuilder(requireContext(), theme)
            .setTitle(title)
            .setMessage(message)
            .setNegativeButton(R.string.res_keep, null)
            .setPositiveButton(positive) { _, _ -> onConfirm() }
            .show()
    }

    /**
     * Dialog with one text field. `validate` returns an error message or null;
     * the dialog stays open until the value is valid.
     */
    protected fun promptText(
        @StringRes title: Int,
        @StringRes hint: Int,
        @StringRes positive: Int,
        inputType: Int,
        initial: String = "",
        maxLength: Int? = null,
        validate: (String) -> String?,
        onValid: (String) -> Unit
    ) {
        val content = layoutInflater.inflate(R.layout.dialog_res_input, null)
        val layout = content.findViewById<TextInputLayout>(R.id.dialogInputLayout)
        val input = content.findViewById<TextInputEditText>(R.id.dialogInput)
        layout.setHint(hint)
        input.inputType = inputType
        input.setText(initial)
        if (maxLength != null) {
            layout.isCounterEnabled = true
            layout.counterMaxLength = maxLength
            input.filters = arrayOf(android.text.InputFilter.LengthFilter(maxLength))
        }
        if (inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE != 0) input.minLines = 3

        val dialog = MaterialAlertDialogBuilder(requireContext(), R.style.ThemeOverlay_SolarGridX_Res_Dialog)
            .setTitle(title)
            .setView(content)
            .setNegativeButton(R.string.btn_cancel, null)
            .setPositiveButton(positive, null)
            .create()
        dialog.setOnShowListener {
            input.requestFocus()
            dialog.getButton(android.content.DialogInterface.BUTTON_POSITIVE).setOnClickListener {
                val value = input.text?.toString()?.trim().orEmpty()
                val error = validate(value)
                layout.error = error
                if (error == null) {
                    dialog.dismiss()
                    onValid(value)
                }
            }
        }
        dialog.show()
    }

    override fun onResume() {
        super.onResume()
        viewModel.reload()
    }
}
