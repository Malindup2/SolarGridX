package com.solargridx.mobile.reservations.ui

import android.content.Context
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import androidx.annotation.StringRes
import androidx.core.widget.doAfterTextChanged
import com.google.android.material.textfield.TextInputEditText
import com.solargridx.mobile.R

/** Binds an included view_search_bar: reports each change; the search key just hides the keyboard. */
class SearchBar(root: View, @StringRes hint: Int? = null, onQuery: (String) -> Unit) {

    private val input: TextInputEditText = root.findViewById(R.id.searchInput)

    init {
        hint?.let { input.setHint(it) }
        input.doAfterTextChanged { onQuery(it?.toString().orEmpty()) }
        input.setOnEditorActionListener { view, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                (view.context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager)
                    .hideSoftInputFromWindow(view.windowToken, 0)
                view.clearFocus()
                true
            } else false
        }
    }

    val query: String get() = input.text?.toString().orEmpty()

    fun clear() = input.setText("")
}
