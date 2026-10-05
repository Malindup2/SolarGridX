package com.solargridx.mobile.common

/** What a screen is showing. ViewModels expose one of these as a StateFlow. */
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Content<T>(val data: T) : UiState<T>
    data class Error(val error: ApiError) : UiState<Nothing>
}

/** A one-off write call (submit, approve, cancel...). */
sealed interface ActionState<out T> {
    data object Idle : ActionState<Nothing>
    data object Running : ActionState<Nothing>
    data class Done<T>(val data: T) : ActionState<T>
    data class Failed(val error: ApiError) : ActionState<Nothing>
}
